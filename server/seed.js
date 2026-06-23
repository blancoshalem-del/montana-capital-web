/* ============================================================
   Crea el secreto JWT (.env) y los usuarios del back office
   con CLAVES ALEATORIAS. Imprime las credenciales y las guarda
   en CREDENCIALES-PANEL.txt (guárdalas y luego borra ese archivo).
   ============================================================ */
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* clave legible y fuerte: 16 caracteres base62 */
function genPassword(len = 16) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += abc[bytes[i] % abc.length];
  return s;
}

/* 1) secreto JWT en .env (si no existe) */
const envPath = join(__dirname, '.env');
if (!existsSync(envPath)) {
  const secret = randomBytes(48).toString('base64url');
  writeFileSync(envPath,
`PORT=5050
JWT_SECRET=${secret}
ALLOWED_ORIGINS=http://localhost:5050,http://127.0.0.1:5050
`);
  console.log('✓ .env creado con un JWT_SECRET aleatorio.');
}

/* 2) usuarios */
const USERS = [
  { name: 'Administrador', email: 'montanacapital.sas@gmail.com', role: 'admin' },
  { name: 'Montana Capital SAS', email: 'soporte@montanacapital.com', role: 'soporte' },
];

const out = [];
for (const u of USERS) {
  const existing = db.findUserByEmail(u.email);
  if (existing) { console.log(`• Ya existe: ${u.email} (no se cambia su clave)`); continue; }
  const password = genPassword();
  const passHash = await bcrypt.hashSync(password, 10);
  db.upsertUser({ ...u, passHash });
  out.push({ ...u, password });
}

if (out.length) {
  const lines = [
    '====================================================',
    ' CREDENCIALES DEL PANEL — Montana Capital SAS',
    ' Guárdalas en un lugar seguro y BORRA este archivo.',
    ' Entra en:  http://localhost:5050/admin',
    '====================================================',
    ...out.map(u => `\n  Rol:    ${u.role}\n  Usuario (correo): ${u.email}\n  Clave:  ${u.password}`),
    '',
  ].join('\n');
  const file = join(__dirname, '..', 'CREDENCIALES-PANEL.txt');
  appendFileSync(file, lines + '\n');
  console.log('\n' + lines);
  console.log(`\n✓ Credenciales guardadas también en: ${file}`);
} else {
  console.log('\nNo se crearon usuarios nuevos.');
}
