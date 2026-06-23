/* ============================================================
   MONTANA CAPITAL — Calificador inteligente de solicitudes
   ------------------------------------------------------------
   Asistente de reglas (no usa API externa, no tiene costo).
   Analiza cada solicitud y devuelve:
     score    : 0–100  (qué tan caliente / valioso es el lead)
     priority : 'alta' | 'media' | 'baja'
     tags     : etiquetas detectadas (blockchain, app, etc.)
     reasons  : explicación legible de por qué esa puntuación
     spam     : true si parece bot / basura
   Se puede reemplazar luego por un modelo de IA real sin tocar
   el resto del sistema: misma firma de entrada y salida.
   ============================================================ */

const FREE_EMAIL = ['gmail.com','hotmail.com','outlook.com','yahoo.com','yahoo.es','icloud.com','live.com','hotmail.es'];

/* palabras que indican un proyecto de alto valor / intención seria */
const SIGNALS = {
  blockchain: { re: /blockchain|nft|cripto|crypto|smart\s*contract|token|web3|wallet/i, pts: 18, tag: 'Blockchain' },
  plataforma: { re: /plataforma|sistema|software|erp|crm|panel|backend|integral|saas/i, pts: 14, tag: 'Plataforma' },
  app:        { re: /\bapp\b|aplicaci[oó]n|m[oó]vil|android|ios|flutter/i, pts: 10, tag: 'App' },
  ecommerce:  { re: /tienda|e-?commerce|carrito|pasarela|\bpos\b|punto de venta|pago en l[ií]nea/i, pts: 10, tag: 'E-commerce' },
  empresa:    { re: /empresa|compa[ñn][ií]a|negocio|s\.?a\.?s|ltda|corporativ/i, pts: 6, tag: 'Empresa' },
  urgencia:   { re: /urgente|cuanto antes|lo antes posible|esta semana|ya mismo|pronto/i, pts: 8, tag: 'Urgente' },
  presupuesto:{ re: /presupuesto|invertir|inversi[oó]n|contrato|factura|cotiza/i, pts: 8, tag: 'Con presupuesto' },
  sociedad:   { re: /sociedad|socio|porcentaje|utilidades|startup|emprendimiento/i, pts: 7, tag: 'Modelo sociedad' },
};

/* señales de spam / bot */
const SPAM = /(seo services|backlink|rank your|loan|casino|viagra|bitcoin doubl|guaranteed|click here|http[s]?:\/\/\S+\.(ru|cn|xyz|top)\b)/i;

/* extrae el mayor monto en pesos mencionado (soporta "5 millones", "1.500.000", "$2M") */
function detectBudget(text) {
  if (!text) return 0;
  const t = text.toLowerCase().replace(/\./g, '').replace(/,/g, '');
  let max = 0;
  // "5 millones", "2 mill", "3m"
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(millon|millones|mill|m\b)/g)) {
    max = Math.max(max, parseFloat(m[1]) * 1_000_000);
  }
  // números grandes sueltos (>= 6 cifras), p.ej. 1500000
  for (const m of t.matchAll(/\$?\s?(\d{6,})/g)) {
    max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export function scoreLead(lead = {}) {
  const name = String(lead.name || '');
  const email = String(lead.email || '').toLowerCase();
  const message = String(lead.message || '');
  const type = String(lead.type || '');
  const budgetField = String(lead.budget || '');
  const company = String(lead.company || '');
  const phone = String(lead.phone || '');
  const haystack = `${type} ${message} ${budgetField} ${company}`;

  let score = 35;                 // base
  const reasons = [];
  const tags = [];

  /* --- spam / bot --- */
  if (SPAM.test(haystack) || /http[s]?:\/\//i.test(message) && message.length < 60) {
    return { score: 0, priority: 'baja', tags: ['Posible spam'], reasons: ['Contenido con patrones de spam/bot.'], spam: true };
  }

  /* --- señales de valor --- */
  for (const k in SIGNALS) {
    const s = SIGNALS[k];
    if (s.re.test(haystack)) { score += s.pts; tags.push(s.tag); reasons.push(`Menciona ${s.tag.toLowerCase()} (+${s.pts}).`); }
  }

  /* --- presupuesto detectado --- */
  const budget = Math.max(detectBudget(budgetField), detectBudget(message));
  if (budget >= 6_000_000)      { score += 22; reasons.push('Presupuesto alto (≥ $6.000.000) (+22).'); tags.push('Presupuesto alto'); }
  else if (budget >= 1_000_000) { score += 14; reasons.push('Presupuesto medio (≥ $1.000.000) (+14).'); tags.push('Presupuesto medio'); }
  else if (budget >= 300_000)   { score += 6;  reasons.push('Presupuesto bajo detectado (+6).'); }

  /* --- datos de contacto completos --- */
  if (phone && /\d{7,}/.test(phone.replace(/\D/g, ''))) { score += 6; reasons.push('Dejó teléfono (+6).'); }
  else { reasons.push('Sin teléfono.'); }
  if (company) { score += 4; reasons.push('Indicó empresa (+4).'); }

  /* --- correo corporativo vs gratuito --- */
  const domain = email.split('@')[1] || '';
  if (domain && !FREE_EMAIL.includes(domain)) { score += 8; reasons.push('Correo corporativo (+8).'); tags.push('Correo corporativo'); }

  /* --- calidad del mensaje --- */
  const len = message.trim().length;
  if (len >= 200)      { score += 8; reasons.push('Mensaje detallado (+8).'); }
  else if (len >= 80)  { score += 4; reasons.push('Mensaje con contexto (+4).'); }
  else if (len < 25)   { score -= 8; reasons.push('Mensaje muy corto (−8).'); }

  /* --- penaliza nombres/correos sospechosos --- */
  if (!name || name.length < 3) { score -= 6; reasons.push('Nombre incompleto (−6).'); }
  if (/[A-Z]{8,}/.test(message)) { score -= 4; reasons.push('Exceso de mayúsculas (−4).'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const priority = score >= 65 ? 'alta' : score >= 35 ? 'media' : 'baja';

  return { score, priority, tags: [...new Set(tags)], reasons, spam: false, budgetDetected: budget };
}
