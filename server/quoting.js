/* ============================================================
   MONTANA CAPITAL — motor de cotización (cotizador en línea)
   Modelo de negocio real. Lenguaje claro (no técnico) para el
   cliente. Fuente única de precios — editable aquí.
   ============================================================ */

const COP = 'COP';
const money = n => '$' + Math.round(n).toLocaleString('es-CO');

/* ---------- PAQUETES (paso 1) ---------- */
export const PACKAGES = [
  { id: 'landing',     label: 'Landing page',              desc: 'Una página profesional, informativa, lista para mostrar tu marca y recibir clientes.' },
  { id: 'web',         label: 'Página web con plataforma', desc: 'Un sitio completo: informativo y, si lo necesitas, con acceso interno para tu equipo.' },
  { id: 'empresarial', label: 'Plataforma empresarial',    desc: 'Software interno para tu empresa: varios usuarios, mucha información y procesos optimizados.' },
  { id: 'ia',          label: 'Agente de IA por WhatsApp', desc: 'Un asistente que atiende, responde y vende por WhatsApp por ti, 24/7.' },
  { id: 'blockchain',  label: 'Blockchain / Web3',         desc: 'NFT, tokens, smart contracts y DApps. Cotización personalizada.' },
];

/* ---------- VARIANTES por paquete (paso 2, opción única que define el precio) ---------- */
export const VARIANTS = {
  web: [
    { id: 'informativa', label: 'Solo informativa', desc: 'Como un sitio de hotel o restaurante: tu información, catálogo o menú y contacto. Sin acceso interno.', low: 1000000, high: 1000000 },
    { id: 'backoffice',  label: 'Con acceso interno (back office)', desc: 'Además del sitio, un panel privado y seguro para que tu equipo gestione la operación.', low: 1500000, high: 1500000 },
  ],
  empresarial: [
    { id: 'estandar',   label: 'Estándar',   desc: 'Un área o proceso, pocos usuarios.', low: 6000000, high: 6500000 },
    { id: 'intermedia', label: 'Intermedia', desc: 'Varias áreas y trabajadores, más información.', low: 6500000, high: 7500000 },
    { id: 'avanzada',   label: 'Avanzada',   desc: 'Muchos módulos, gran volumen de datos e integraciones.', low: 7500000, high: 8000000 },
  ],
  ia: [
    { id: 'basico',      label: 'Básico',      desc: 'Responde y cierra ventas por WhatsApp, sin complejidad.', low: 1000000, high: 1000000 },
    { id: 'avanzado',    label: 'Avanzado',    desc: 'Hace varias tareas: analiza imágenes, datos y recibos, y maneja mucha información.', low: 1500000, high: 1500000 },
    { id: 'empresarial', label: 'Empresarial', desc: 'Integrado en una plataforma, con actividades empresariales de alta complejidad.', low: 5000000, high: 5000000 },
  ],
};

/* ---------- "¿Qué quieres que tenga?" (informativo, incluido en el paquete) ---------- */
export const FEATURES = {
  web: [
    { id: 'reservas',  label: 'Reservas o citas en línea' },
    { id: 'menu',      label: 'Carta / menú digital' },
    { id: 'catalogo',  label: 'Catálogo de productos o servicios' },
    { id: 'blog',      label: 'Blog o noticias' },
    { id: 'formularios', label: 'Formularios de contacto / registro' },
    { id: 'redes',     label: 'Enlaces e integración con redes sociales' },
  ],
};

/* ---------- Tipos de proyecto blockchain (informativo, cotización personalizada) ---------- */
export const BLOCKCHAIN_KINDS = [
  { id: 'nft',      label: 'Colección / pase NFT' },
  { id: 'token',    label: 'Token o criptoactivo' },
  { id: 'contract', label: 'Smart contracts' },
  { id: 'dapp',     label: 'Aplicación descentralizada (DApp)' },
  { id: 'otro',     label: 'Otro / aún no lo sé' },
];

/* ---------- Extras opcionales (con precio) para landing y web ---------- */
export const ADDONS = {
  landing: [
    { id: 'dominio',   label: 'Dominio + hosting (1 año)', price: 250000 },
    { id: 'correo',    label: 'Correo corporativo',        price: 150000 },
    { id: 'copy',      label: 'Redacción profesional de textos', price: 250000 },
    { id: 'idioma',    label: 'Versión en otro idioma',    price: 300000 },
  ],
  web: [
    { id: 'dominio',   label: 'Dominio + hosting (1 año)', price: 250000 },
    { id: 'correo',    label: 'Correo corporativo',        price: 150000 },
    { id: 'copy',      label: 'Redacción profesional de textos', price: 250000 },
    { id: 'idioma',    label: 'Versión en otro idioma',    price: 300000 },
  ],
};

/* ---------- Qué incluye cada servicio (se muestra al cliente, sin tecnicismos) ---------- */
const INCLUDES = {
  landing: [
    'Diseño a la medida de tu marca',
    'Secciones informativas (inicio, servicios, sobre ti, etc.)',
    'Espacio para tus textos e imágenes',
    'Enlaces directos a tus redes sociales',
    'Sección de contacto y botón de WhatsApp',
    'Se ve perfecta en celular y computador',
    'Optimización básica para aparecer en Google (SEO)',
  ],
  web_informativa: [
    'Sitio web de varias secciones, a la medida de tu marca',
    'Tu información, catálogo o menú y galería',
    'Sección de contacto, WhatsApp y redes sociales',
    'Se ve perfecta en celular y computador',
    'Optimización básica para aparecer en Google (SEO)',
  ],
  web_backoffice: [
    'Todo lo del sitio informativo, más:',
    'Acceso interno seguro con usuario y contraseña',
    'Panel privado (back office) para que tu equipo gestione la operación',
    'Manejo de usuarios y permisos por rol',
    'Seguridad reforzada para proteger tu información',
  ],
  empresarial: [
    'Plataforma interna para varios trabajadores, con roles y permisos',
    'Back office completo para administrar tu operación',
    'Base de datos robusta para todo tu volumen de información',
    'Automatización de tus procesos internos',
    'Reportes y métricas en tiempo real',
    'Seguridad de nivel empresarial',
    'Soporte y mejoras continuas',
  ],
  ia_basico: [
    'Atiende por WhatsApp automáticamente, 24/7',
    'Responde las preguntas frecuentes de tus clientes',
    'Toma los datos del cliente y ayuda a cerrar la venta',
    'Habla con el tono de tu marca',
  ],
  ia_avanzado: [
    'Todo lo del agente básico, más:',
    'Realiza varias tareas, no solo responder',
    'Analiza imágenes, datos y recibos que le envían',
    'Maneja y recuerda mucha información en una base de datos',
    'Se integra con tus herramientas',
  ],
  ia_empresarial: [
    'Agente integrado dentro de tu propia plataforma',
    'Ejecuta actividades empresariales de alta complejidad',
    'Se conecta con tus sistemas, datos y procesos',
    'Acompañamiento y ajustes dedicados',
  ],
  blockchain: [
    'Acompañamiento especializado en Web3',
    'Smart contracts auditables y seguros',
    'NFT o tokens con utilidad real para tu negocio',
    'Despliegue y trazabilidad on-chain',
  ],
};

/* la config que necesita el sitio para dibujar el cotizador */
export function quoteConfig() {
  return {
    packages: PACKAGES,
    variants: VARIANTS,
    features: FEATURES,
    addons: ADDONS,
    blockchainKinds: BLOCKCHAIN_KINDS,
    includes: INCLUDES,
    currency: COP,
  };
}

function includesKey(typeId, variantId) {
  if (typeId === 'landing') return 'landing';
  if (typeId === 'web') return variantId === 'backoffice' ? 'web_backoffice' : 'web_informativa';
  if (typeId === 'empresarial') return 'empresarial';
  if (typeId === 'ia') return variantId === 'empresarial' ? 'ia_empresarial' : variantId === 'avanzado' ? 'ia_avanzado' : 'ia_basico';
  if (typeId === 'blockchain') return 'blockchain';
  return 'landing';
}

const clip = (s, n) => String(s ?? '').trim().slice(0, n);

/* calcula la cotización a partir de las selecciones del cliente */
export function computeQuote(sel = {}) {
  const pkg = PACKAGES.find(p => p.id === sel.type) || PACKAGES[0];
  const variants = VARIANTS[pkg.id] || [];
  const variant = variants.find(v => v.id === sel.variant) || variants[0] || null;
  const chosenFeatures = Array.isArray(sel.features) ? sel.features : [];
  const chosenAddons = Array.isArray(sel.addons) ? sel.addons : [];
  const observations = clip(sel.observations, 1200);

  // features elegidas (informativas, incluidas)
  const featDefs = (FEATURES[pkg.id] || []).filter(f => chosenFeatures.includes(f.id));
  // extras con precio
  const addonDefs = (ADDONS[pkg.id] || []).filter(a => chosenAddons.includes(a.id));
  const addonsTotal = addonDefs.reduce((a, b) => a + b.price, 0);

  const includes = (INCLUDES[includesKey(pkg.id, variant && variant.id)] || []).slice();

  // ---- precio ----
  const custom = pkg.id === 'blockchain';
  let baseLow = 0, baseHigh = 0, fixed = false;
  if (pkg.id === 'landing') { baseLow = baseHigh = 500000; fixed = true; }
  else if (variant) { baseLow = variant.low; baseHigh = variant.high; fixed = variant.low === variant.high; }

  const totalLow = custom ? null : baseLow + addonsTotal;
  const totalHigh = custom ? null : baseHigh + addonsTotal;
  const single = !custom && totalLow === totalHigh;
  const rangeText = custom ? 'Cotización personalizada'
    : (single ? money(totalLow) + ' COP' : money(totalLow) + ' – ' + money(totalHigh) + ' COP');

  let note;
  if (custom) note = 'Los proyectos blockchain se cotizan de forma personalizada por su mayor alcance. Un especialista te contactará con una propuesta a tu medida.';
  else if (pkg.id === 'empresarial') note = 'El valor final dentro del rango depende de la complejidad y el número de módulos. Lo afinamos contigo en una breve asesoría.';
  else note = 'Estimación en línea. El valor final se confirma tras una breve asesoría según tu alcance.';

  return {
    currency: COP, custom,
    package: { id: pkg.id, label: pkg.label },
    variant: variant ? { id: variant.id, label: variant.label } : null,
    includes,
    features: featDefs.map(f => f.label),
    addons: addonDefs.map(a => ({ label: a.label, price: a.price })),
    addonsTotal,
    observations,
    totalLow, totalHigh, single, rangeText,
    note, validDays: 15,
  };
}

export const fmtMoney = money;
