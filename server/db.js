/* ============================================================
   Almacenamiento de leads + usuarios.
   - Local / sin configurar: archivo JSON (data.json).
   - En producción con MONGODB_URI: MongoDB (datos PERMANENTES).
   La interfaz (db.data, addLead, updateLead, ...) no cambia: se
   mantiene una copia en memoria (cache) y cada cambio se guarda.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || __dirname;
const FILE = join(DATA_DIR, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'montana';

const empty = { users: [], leads: [], seq: { lead: 0 } };

function loadFile() {
  if (!existsSync(FILE)) return structuredClone(empty);
  try { return JSON.parse(readFileSync(FILE, 'utf8')); }
  catch { return structuredClone(empty); }
}

let cache = loadFile();
let useMongo = false;
let coll = null;
let writeChain = Promise.resolve();

/* Conecta a MongoDB si hay MONGODB_URI. Debe llamarse (await) antes de usar la db. */
async function init() {
  if (!MONGODB_URI) {
    console.log('• Almacenamiento: archivo local (data.json) — datos NO permanentes en hosting gratis');
    return;
  }
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  coll = client.db(MONGODB_DB).collection('state');
  const doc = await coll.findOne({ _id: 'singleton' });
  if (doc && doc.data) {
    cache = { ...structuredClone(empty), ...doc.data };
  } else {
    await coll.updateOne({ _id: 'singleton' }, { $set: { data: cache } }, { upsert: true });
  }
  useMongo = true;
  console.log('✓ Almacenamiento: MongoDB (datos permanentes)');
}

function persistFile() {
  const tmp = FILE + '.tmp';            // escritura atómica
  writeFileSync(tmp, JSON.stringify(cache, null, 2));
  renameSync(tmp, FILE);
}

function persist() {
  if (useMongo) {
    const snapshot = structuredClone(cache);   // evita mutaciones durante el guardado async
    writeChain = writeChain
      .then(() => coll.updateOne({ _id: 'singleton' }, { $set: { data: snapshot } }, { upsert: true }))
      .catch(err => console.error('⚠ Error guardando en MongoDB:', err.message));
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
