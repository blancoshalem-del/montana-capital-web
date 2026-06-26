/* ============================================================
   Almacenamiento de leads + usuarios.
   - Local / sin configurar: archivo JSON (data.json).
   - En producción con DATABASE_URL: PostgreSQL/Neon (datos PERMANENTES).
   La interfaz (db.data, addLead, updateLead, ...) no cambia: se
   mantiene una copia en memoria (cache) y cada cambio se guarda.
   Todo el estado se guarda como un único registro JSON (jsonb).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || __dirname;
const FILE = join(DATA_DIR, 'data.json');
const DATABASE_URL = process.env.DATABASE_URL || '';

const empty = { users: [], leads: [], seq: { lead: 0 } };

function loadFile() {
  if (!existsSync(FILE)) return structuredClone(empty);
  try { return JSON.parse(readFileSync(FILE, 'utf8')); }
  catch { return structuredClone(empty); }
}

let cache = loadFile();
let usePg = false;
let pool = null;
let writeChain = Promise.resolve();

/* Conecta a PostgreSQL si hay DATABASE_URL. Debe llamarse (await) antes de usar la db. */
async function init() {
  if (!DATABASE_URL) {
    console.log('• Almacenamiento: archivo local (data.json) — datos NO permanentes en hosting gratis');
    return;
  }
  const pg = (await import('pg')).default;
  pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pool.query('CREATE TABLE IF NOT EXISTS app_state (id text PRIMARY KEY, data jsonb NOT NULL)');
  const r = await pool.query("SELECT data FROM app_state WHERE id = 'singleton'");
  if (r.rows.length && r.rows[0].data) {
    cache = { ...structuredClone(empty), ...r.rows[0].data };
  } else {
    await pool.query(
      "INSERT INTO app_state (id, data) VALUES ('singleton', $1) ON CONFLICT (id) DO NOTHING",
      [JSON.stringify(cache)]
    );
  }
  usePg = true;
  console.log('✓ Almacenamiento: PostgreSQL (Neon) — datos permanentes');
}

function persistFile() {
  const tmp = FILE + '.tmp';            // escritura atómica
  writeFileSync(tmp, JSON.stringify(cache, null, 2));
  renameSync(tmp, FILE);
}

function persist() {
  if (usePg) {
    const snapshot = JSON.stringify(cache);   // congela el estado para el guardado async
    writeChain = writeChain
      .then(() => pool.query(
        "INSERT INTO app_state (id, data) VALUES ('singleton', $1) ON CONFLICT (id) DO UPDATE SET data = $1",
        [snapshot]
      ))
      .catch(err => console.error('⚠ Error guardando en PostgreSQL:', err.message));
    return;
  }
  persistFile();
}

export const db = {
  init,
  get data() { return cache; },
  reload() { cache = loadFile(); return cache; },
  save() { persist(); },

  /* ---- users ---- */
  findUserByEmail(email) {
    return cache.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  },
  upsertUser(user) {
    const i = cache.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (i >= 0) cache.users[i] = { ...cache.users[i], ...user };
    else cache.users.push(user);
    persist();
  },

  /* ---- leads ---- */
  addLead(lead) {
    cache.seq.lead += 1;
    const rec = { id: cache.seq.lead, status: 'nuevo', notes: '', ...lead, createdAt: new Date().toISOString() };
    cache.leads.unshift(rec);
    persist();
    return rec;
  },
  listLeads({ status, q } = {}) {
    let rows = cache.leads;
    if (status && status !== 'todos') rows = rows.filter(r => r.status === status);
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter(r =>
        [r.name, r.email, r.company, r.message, r.type].filter(Boolean)
          .some(v => String(v).toLowerCase().includes(s)));
    }
    return rows;
  },
  updateLead(id, patch) {
    const r = cache.leads.find(x => x.id === Number(id));
    if (!r) return null;
    if (typeof patch.status === 'string') r.status = patch.status;
    if (typeof patch.notes === 'string') r.notes = patch.notes;
    if (typeof patch.validated === 'boolean') {
      r.validated = patch.validated;
      r.validatedBy = patch.validated ? (patch.validatedBy || '') : '';
      r.validatedAt = patch.validated ? (patch.validatedAt || new Date().toISOString()) : '';
    }
    if (typeof patch.accepted === 'boolean') { r.accepted = patch.accepted; if (patch.accepted) r.acceptedAt = new Date().toISOString(); }
    if (typeof patch.quoteId === 'string') r.quoteId = patch.quoteId;
    persist();
    return r;
  },
};
