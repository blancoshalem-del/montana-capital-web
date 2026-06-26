/* ============================================================
   MONTANA CAPITAL — backend seguro
   - JWT (login del back office)
   - rate limiting (anti fuerza bruta / anti-bots)
   - CORS restringido
   - Helmet (cabeceras de seguridad)
   - honeypot anti-bot en el formulario de cotización
   - sirve el sitio estático y el panel /admin
   ============================================================ */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db } from './db.js';
import { scoreLead } from './lead-scoring.js';
import { ruleAgentStep, aiAgentStep, aiEnabled, buildLead } from './agent.js';
import { quoteConfig, computeQuote } from './quoting.js';
import { buildQuotePdf } from './pdf.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = join(__dirname, '..');           // la carpeta del sitio estático

const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'CAMBIA-ESTE-SECRETO-EN-PRODUCCION';
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  `http://localhost:${PORT},http://127.0.0.1:${PORT}`).split(',').map(s => s.trim());

/* ---------- correo (aviso de nueva solicitud) ----------
   Se activa solo si defines SMTP_USER y SMTP_PASS en el .env.
   Para Gmail: usa una "contraseña de aplicación" (no la normal). */
let mailer = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  const port = Number(process.env.SMTP_PORT || 465);
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log('✓ Aviso por correo ACTIVADO →', process.env.NOTIFY_TO || process.env.SMTP_USER);
}
function notifyNewLead(lead) {
  if (!mailer) return;
  const to = process.env.NOTIFY_TO || process.env.SMTP_USER;
  mailer.sendMail({
    from: `"Montana Capital Web" <${process.env.SMTP_USER}>`,
    to,
    subject: `🔔 Nueva solicitud: ${lead.name}${lead.type ? ' — ' + lead.type : ''}`,
    text: `Nueva solicitud recibida en el sitio:\n\n`
      + `Nombre:   ${lead.name}\nCorreo:   ${lead.email}\nTeléfono: ${lead.phone || '—'}\n`
      + `Empresa:  ${lead.company || '—'}\nInterés:  ${lead.type || '—'}\n\nMensaje:\n${lead.message}\n\n`
      + `Entra al panel para gestionarla.`,
  }).then(() => console.log('✓ correo de aviso enviado')).catch(e => console.log('aviso por correo falló:', e.message));
}

const app = express();
app.set('trust proxy', 1);                          // detrás de Nginx/ELB en AWS

/* ---------- seguridad base ---------- */
app.use(helmet({
  contentSecurityPolicy: false,                     // el sitio usa CDNs (three.js, gsap, fonts)
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);              // peticiones del propio servidor / curl
    if (ORIGINS.includes(origin)) return cb(null, true);
    try {
      const h = new URL(origin).hostname;
      // permite local, túneles de Cloudflare y despliegues en Render
      if (h === 'localhost' || h === '127.0.0.1' ||
          h.endsWith('.trycloudflare.com') || h.endsWith('.onrender.com')) return cb(null, true);
    } catch {}
    return cb(null, false);                           // no permitido (sin lanzar error 500)
  },
  credentials: true,
}));
app.use(express.json({ limit: '20kb' }));           // límite de tamaño → anti abuso

/* ---------- rate limits ---------- */
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, message: { error: 'Demasiados intentos. Espera unos minutos.' } });
const quoteLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'Has enviado muchas solicitudes. Intenta más tarde.' } });
const agentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Demasiados mensajes seguidos. Espera un momento.' } });
app.use('/api/', apiLimiter);

/* ---------- helpers ---------- */
function sign(user) {
  return jwt.sign({ sub: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Sesión inválida o expirada' }); }
}
const clean = (v, max = 2000) => String(v ?? '').trim().slice(0, max);
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ============================================================
   API
   ============================================================ */

/* --- cotización pública (la usa el sitio) --- */
app.post('/api/quote', quoteLimiter, (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true });      // honeypot: bot detectado → ignora en silencio

  const name = clean(b.name, 120);
  const email = clean(b.email, 160);
  const message = clean(b.message, 4000);
  if (!name || !isEmail(email) || !message)
    return res.status(400).json({ error: 'Completa nombre, un correo válido y el mensaje.' });

  const base = {
    name, email, message,
    phone: clean(b.phone, 40),
    company: clean(b.company, 160),
    type: clean(b.type, 80),
    budget: clean(b.budget, 80),
    source: clean(b.source, 40) || 'web',
    ip: req.ip,
  };
  // calificación inteligente (sin costo): puntúa y prioriza el lead
  const q = scoreLead(base);
  const lead = db.addLead({ ...base, score: q.score, priority: q.priority, tags: q.tags, reasons: q.reasons, spam: q.spam });
  if (!q.spam) notifyNewLead(lead);                  // no avisamos por spam evidente
  res.json({ ok: true, id: lead.id });
});

/* --- agente / asistente comercial (chat del sitio) --- */
app.post('/api/agent/chat', agentLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ reply: '¡Gracias!', done: true }); // honeypot
    const messages = Array.isArray(b.messages) ? b.messages.slice(-30) : [];
    const lead = (b.lead && typeof b.lead === 'object') ? b.lead : {};

    let step;
    if (aiEnabled()) {
      try { step = await aiAgentStep({ messages, lead }); }
      catch (e) { console.log('agente IA falló, uso modo guiado:', e.message); step = ruleAgentStep({ messages, lead }); }
    } else {
      step = ruleAgentStep({ messages, lead });
    }

    if (!step.done) {
      return res.json({ reply: step.reply, options: step.options || null, lead: step.lead, done: false });
    }

    // listo: armamos la solicitud, la calificamos y la guardamos
    const baseLead = buildLead(step.lead);
    baseLead.ip = req.ip;
    if (!baseLead.name || !isEmail(baseLead.email)) {   // por seguridad: faltan datos clave
      return res.json({ reply: 'Para registrar tu solicitud necesito tu nombre y un correo válido 🙂', lead: step.lead, done: false });
    }
    const qa = scoreLead(baseLead);
    const newLead = db.addLead({ ...baseLead, score: qa.score, priority: qa.priority, tags: qa.tags, reasons: qa.reasons, spam: qa.spam });
    if (!qa.spam) notifyNewLead(newLead);

    const first = baseLead.name.split(' ')[0];
    const cierre = qa.priority === 'alta'
      ? `¡Tu proyecto encaja muy bien con lo que hacemos! 🚀 Ya registré tu solicitud y un asesor de Montana Capital te contactará muy pronto. ¡Gracias, ${first}!`
      : `¡Listo, ${first}! ✅ Registré tu solicitud y te contactaremos pronto. Si quieres, también puedes escribirnos por WhatsApp.`;
    res.json({ reply: step.reply ? step.reply + '\n\n' + cierre : cierre, done: true, leadId: newLead.id });
  } catch (e) {
    console.log('error en /api/agent/chat:', e.message);
    res.status(500).json({ error: 'No se pudo procesar el mensaje.' });
  }
});

/* ============================================================
   COTIZADOR EN LÍNEA
   ============================================================ */
const QUOTES_DIR = join(__dirname, 'quotes');
function quotePath(id, token) { return join(QUOTES_DIR, `${id}-${token}.pdf`); }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return iso; } }

/* config para dibujar el cotizador (sin exponer la fórmula) */
app.get('/api/quote/config', (_req, res) => res.json(quoteConfig()));

/* estimación en vivo (no guarda nada) */
app.post('/api/quote/estimate', quoteLimiter, (req, res) => {
  try { res.json(computeQuote(req.body || {})); }
  catch (e) { res.status(400).json({ error: 'No se pudo calcular la estimación.' }); }
});

/* envío: crea el lead (CRM), genera y guarda el PDF de cotización */
app.post('/api/quote/submit', quoteLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true });            // honeypot
    const c = b.client || {};
    const name = clean(c.name, 120);
    const email = clean(c.email, 160);
    if (!name || !isEmail(email)) return res.status(400).json({ error: 'Necesitamos tu nombre y un correo válido.' });

    const sel = { ...(b.selections || {}), observations: clean(c.observations || (b.selections || {}).observations, 1200) };
    const quote = computeQuote(sel);
    const typeLabel = quote.package.label + (quote.variant ? ' · ' + quote.variant.label : '');
    const message = `Cotización en línea — ${typeLabel}. `
      + (quote.features?.length ? `Quiere: ${quote.features.join(', ')}. ` : '')
      + (quote.addons?.length ? `Extras: ${quote.addons.map(a => a.label).join(', ')}. ` : '')
      + `Estimado: ${quote.rangeText}.`
      + (quote.observations ? `\n\nObservaciones del cliente: ${quote.observations}` : '');

    const base = {
      name, email,
      phone: clean(c.phone, 40),
      company: clean(c.company, 160),
      city: clean(c.city, 80),
      type: typeLabel,
      budget: quote.rangeText,
      message,
      source: 'cotizador',
    };
    const q = scoreLead(base);
    const token = randomBytes(12).toString('hex');
    const lead = db.addLead({ ...base, ip: req.ip, score: q.score, priority: q.priority, tags: q.tags, reasons: q.reasons, spam: q.spam, quote, accepted: false, pdfToken: token });

    const quoteId = `MC-${new Date().getFullYear()}-${String(lead.id).padStart(4, '0')}`;
    const now = new Date();
    const validUntil = new Date(now.getTime() + quote.validDays * 86400000);
    db.updateLead(lead.id, { quoteId });

    // genera y guarda el PDF
    const pdf = await buildQuotePdf({
      quote, client: base,
      meta: { quoteId, date: now.toISOString(), validUntil: validUntil.toISOString() },
    });
    if (!existsSync(QUOTES_DIR)) mkdirSync(QUOTES_DIR, { recursive: true });
    writeFileSync(quotePath(lead.id, token), pdf);

    res.json({ ok: true, id: lead.id, token, quoteId, quote, pdfUrl: `/api/quote/${lead.id}/pdf?t=${token}` });
  } catch (e) {
    console.log('error /api/quote/submit:', e.message);
    res.status(500).json({ error: 'No se pudo generar la cotización.' });
  }
});

/* descarga del PDF (cliente y panel) */
app.get('/api/quote/:id/pdf', (req, res) => {
  const id = Number(req.params.id);
  const token = clean(req.query.t, 40);
  const lead = db.data.leads.find(l => l.id === id);
  if (!lead || lead.pdfToken !== token) return res.status(404).send('No encontrado');
  const p = quotePath(id, token);
  if (!existsSync(p)) return res.status(404).send('PDF no disponible');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="cotizacion-${lead.quoteId || id}.pdf"`);
  res.send(readFileSync(p));
});

/* aceptar y continuar asesoría: marca interés y avisa al equipo con el PDF adjunto */
app.post('/api/quote/:id/accept', quoteLimiter, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const token = clean((req.body || {}).t, 40);
    const lead = db.data.leads.find(l => l.id === id);
    if (!lead || lead.pdfToken !== token) return res.status(404).json({ error: 'No encontrado' });
    db.updateLead(id, { accepted: true, status: 'en_proceso' });

    // correo al equipo con la cotización adjunta
    if (mailer) {
      const to = process.env.NOTIFY_TO || process.env.SMTP_USER;
      const p = quotePath(id, token);
      mailer.sendMail({
        from: `"Montana Capital — Cotizador" <${process.env.SMTP_USER}>`,
        to,
        subject: `🟢 Cliente interesado (aceptó cotización): ${lead.name} — ${lead.quoteId || id}`,
        text: `¡Un cliente aceptó su cotización y quiere asesoría!\n\n`
          + `Nombre:   ${lead.name}\nCorreo:   ${lead.email}\nTeléfono: ${lead.phone || '—'}\n`
          + `Empresa:  ${lead.company || '—'}\nProyecto: ${lead.type || '—'}\nEstimado: ${lead.budget || '—'}\n\n`
          + `${lead.message}\n\nLa cotización va adjunta en PDF. Entra al panel para gestionarlo.`,
        attachments: existsSync(p) ? [{ filename: `cotizacion-${lead.quoteId || id}.pdf`, content: readFileSync(p) }] : [],
      }).then(() => console.log('✓ correo de cotización aceptada enviado')).catch(e => console.log('aviso cotización falló:', e.message));
    }
    res.json({ ok: true });
  } catch (e) {
    console.log('error /api/quote/accept:', e.message);
    res.status(500).json({ error: 'No se pudo registrar.' });
  }
});

/* --- login del back office --- */
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = clean(req.body?.email, 160);
  const password = clean(req.body?.password, 200);
  const user = db.findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const ok = await bcrypt.compare(password, user.passHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
  res.json({ token: sign(user), user: { name: user.name, email: user.email, role: user.role } });
});

app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));

/* --- back office (protegido) --- */
app.get('/api/admin/leads', auth, (req, res) => {
  const rows = db.listLeads({ status: req.query.status, q: req.query.q });
  res.json({ count: rows.length, leads: rows });
});
app.get('/api/admin/stats', auth, (_req, res) => {
  const all = db.data.leads;
  const by = s => all.filter(l => l.status === s).length;
  const byp = p => all.filter(l => (l.priority || 'media') === p).length;
  const porValidar = all.filter(l => !l.validated && l.status !== 'descartado' && !l.spam).length;
  res.json({
    total: all.length,
    nuevo: by('nuevo'), en_proceso: by('en_proceso'), ganado: by('ganado'), descartado: by('descartado'),
    alta: byp('alta'), media: byp('media'), baja: byp('baja'),
    por_validar: porValidar,
  });
});

/* --- exportar solicitudes a Excel (CSV con BOM, abre directo en Excel) --- */
app.get('/api/admin/leads.csv', auth, (req, res) => {
  const rows = db.listLeads({ status: req.query.status, q: req.query.q });
  const cols = ['id','createdAt','priority','score','status','name','email','phone','company','type','budget','tags','message'];
  const head = ['ID','Fecha','Prioridad','Puntaje','Estado','Nombre','Correo','Teléfono','Empresa','Interés','Presupuesto','Etiquetas','Mensaje'];
  const esc = v => {
    let s = Array.isArray(v) ? v.join('; ') : String(v ?? '');
    s = s.replace(/\r?\n/g, ' ').replace(/"/g, '""');
    return `"${s}"`;
  };
  const csv = [head.map(esc).join(',')]
    .concat(rows.map(r => cols.map(c => esc(r[c])).join(',')))
    .join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="solicitudes-montana-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('﻿' + csv);     // BOM para que Excel respete acentos
});
app.patch('/api/admin/leads/:id', auth, (req, res) => {
  const patch = { status: req.body?.status, notes: req.body?.notes };
  if (typeof req.body?.validated === 'boolean') {
    patch.validated = req.body.validated;
    patch.validatedBy = req.user?.name || req.user?.sub || '';
  }
  const r = db.updateLead(req.params.id, patch);
  if (!r) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true, lead: r });
});

/* --- usuarios (sin exponer las claves) --- */
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Solo el administrador puede gestionar usuarios.' });
  next();
}
function genPassword(len = 12) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = randomBytes(len); let s = '';
  for (let i = 0; i < len; i++) s += abc[b[i] % abc.length];
  return s;
}

app.get('/api/admin/users', auth, (_req, res) => {
  res.json({ users: db.data.users.map(u => ({ name: u.name, email: u.email, role: u.role })) });
});

/* crear usuario (solo admin) — si no se manda clave, se genera una */
app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 160).toLowerCase();
  const role = clean(req.body?.role, 20) || 'soporte';
  let password = clean(req.body?.password, 200);
  if (!name || !isEmail(email)) return res.status(400).json({ error: 'Nombre y un correo válido son obligatorios.' });
  if (!['admin', 'soporte'].includes(role)) return res.status(400).json({ error: 'Rol inválido.' });
  if (db.findUserByEmail(email)) return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
  let generated = false;
  if (!password) { password = genPassword(); generated = true; }
  else if (password.length < 6) return res.status(400).json({ error: 'La clave debe tener al menos 6 caracteres.' });
  const passHash = await bcrypt.hash(password, 10);
  db.upsertUser({ name, email, role, passHash });
  res.json({ ok: true, generatedPassword: generated ? password : undefined });
});

/* eliminar usuario (solo admin, no a sí mismo) */
app.delete('/api/admin/users/:email', auth, adminOnly, (req, res) => {
  const email = clean(req.params.email, 160).toLowerCase();
  if (email === String(req.user.sub).toLowerCase()) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
  const before = db.data.users.length;
  db.data.users = db.data.users.filter(u => u.email.toLowerCase() !== email);
  if (db.data.users.length === before) return res.status(404).json({ error: 'No encontrado' });
  db.save();
  res.json({ ok: true });
});

/* --- cambiar la propia contraseña --- */
app.post('/api/admin/change-password', auth, async (req, res) => {
  const current = clean(req.body?.current, 200);
  const next = clean(req.body?.next, 200);
  const user = db.findUserByEmail(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (next.length < 6) return res.status(400).json({ error: 'La nueva clave debe tener al menos 6 caracteres.' });
  const ok = await bcrypt.compare(current, user.passHash);
  if (!ok) return res.status(401).json({ error: 'La clave actual no es correcta.' });
  user.passHash = await bcrypt.hash(next, 10);
  db.upsertUser(user);
  res.json({ ok: true });
});

/* ---------- sitio estático + panel ---------- */
app.get('/admin', (_req, res) => res.sendFile(join(__dirname, 'admin.html')));
app.use(express.static(SITE_DIR, { extensions: ['html'] }));

/* al desplegar en internet: si no hay usuarios, crea el admin desde variables de entorno */
async function ensureAdmin() {
  if (db.data.users.length > 0) return;
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    console.log('⚠  No hay usuarios. Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador.');
    return;
  }
  const passHash = await bcrypt.hash(password, 10);
  db.upsertUser({ name: 'Administrador', email, role: 'admin', passHash });
  console.log('✓ Usuario administrador inicial creado:', email);
}

/* califica solicitudes antiguas que aún no tengan puntaje */
function backfillScores() {
  let changed = false;
  for (const l of db.data.leads) {
    if (typeof l.score !== 'number') {
      const q = scoreLead(l);
      Object.assign(l, { score: q.score, priority: q.priority, tags: q.tags, reasons: q.reasons, spam: q.spam });
      changed = true;
    }
  }
  if (changed) { db.save(); console.log('✓ Solicitudes existentes calificadas.'); }
}

await db.init();
await ensureAdmin();
backfillScores();
app.listen(PORT, () => {
  console.log(`\n  Montana Capital — servidor en  http://localhost:${PORT}`);
  console.log(`  Panel back office en           http://localhost:${PORT}/admin\n`);
});
