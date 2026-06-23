/* ============================================================
   Almacenamiento simple en archivo JSON (sin dependencias nativas).
   Suficiente y seguro para leads + usuarios. En AWS se puede
   migrar a PostgreSQL sin cambiar la lógica de las rutas.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// En internet (Render/AWS) se puede usar un disco persistente vía DATA_DIR
const DATA_DIR = process.env.DATA_DIR || __dirname;
const FILE = join(DATA_DIR, 'data.json');

const empty = { users: [], leads: [], seq: { lead: 0 } };

function load() {
  if (!existsSync(FILE)) return structuredClone(empty);
  try { return JSON.parse(readFileSync(FILE, 'utf8')); }
  catch { return structuredClone(empty); }
}

let cache = load();

function persist() {
  // escritura atómica: escribe a tmp y renombra
  const tmp = FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(cache, null, 2));
  renameSync(tmp, FILE);
}

export const db = {
  get data() { return cache; },
  reload() { cache = load(); return cache; },
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
