/* ============================================================
   MONTANA CAPITAL — Asistente comercial (agente)
   ------------------------------------------------------------
   Conversa con el visitante del sitio, lo califica y arma una
   solicitud lista para el panel. Dos modos:

   1) GUIADO (por defecto, GRATIS, sin API): un flujo de preguntas
      con respuestas rápidas. Funciona siempre, sin costo.
   2) IA REAL (opcional): si defines ANTHROPIC_API_KEY en el .env,
      usa Claude (modelo claude-opus-4-8) para conversar de forma
      natural y registrar la solicitud con una herramienta.

   La interfaz de entrada/salida es la misma en ambos modos, así
   que el sitio no cambia: { messages, lead } -> { reply, options, lead, done }.
   ============================================================ */

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

/* ---------- MODO GUIADO (sin costo) ---------- */
const QUESTIONS = [
  { key: 'type',
    q: '¡Hola! 👋 Soy el asistente de Montana Capital. Te ayudo en un minuto. ¿Qué tipo de proyecto tienes en mente?',
    options: ['Página web', 'Plataforma / sistema interno', 'Aplicación móvil', 'Blockchain / NFT', 'Otro'] },
  { key: 'message',
    q: '¡Perfecto! Cuéntame un poco más: ¿qué necesitas que haga o qué problema quieres resolver?' },
  { key: 'budget',
    q: '¿Tienes un presupuesto aproximado en mente? (sirve para orientarte mejor)',
    options: ['Menos de $1.000.000', '$1.000.000 – $3.000.000', '$3.000.000 – $6.000.000', 'Más de $6.000.000', 'Aún no lo sé'] },
  { key: 'timeline',
    q: '¿Para cuándo lo necesitas?',
    options: ['Lo antes posible', 'En 1–3 meses', 'Más adelante', 'Solo estoy explorando'] },
  { key: 'name',
    q: '¡Genial! ¿Cuál es tu nombre?' },
  { key: 'email',
    q: '¿A qué correo te contactamos?', validate: 'email' },
  { key: 'phone',
    q: '¿Y un WhatsApp o teléfono para contactarte más rápido? (opcional, puedes escribir "no")', optional: true },
];

function nextIndex(lead) {
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    if (q.optional) { if (lead[q.key] === undefined) return i; }
    else if (!lead[q.key]) return i;
  }
  return -1;
}

/* arma el texto de la solicitud a partir de lo conversado */
export function buildLead(lead) {
  const partes = [];
  if (lead.message) partes.push(lead.message);
  if (lead.timeline) partes.push('Plazo: ' + lead.timeline);
  return {
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    type: lead.type || '',
    budget: (lead.budget && !/no lo s/i.test(lead.budget)) ? lead.budget : '',
    message: partes.join(' · ') || (lead.type ? 'Interesado en: ' + lead.type : ''),
    source: 'asistente',
  };
}

export function ruleAgentStep({ messages = [], lead = {} }) {
  lead = { ...lead };
  const last = messages.length ? messages[messages.length - 1] : null;
  const userText = (last && last.role === 'user') ? String(last.content || '').trim() : '';

  const pending = nextIndex(lead);
  if (userText && pending >= 0) {
    const q = QUESTIONS[pending];
    if (q.validate === 'email' && !isEmail(userText)) {
      return { reply: 'Mmm, ese correo no parece válido 🤔 ¿Me lo confirmas? (ej: nombre@correo.com)', options: q.options, lead, done: false };
    }
    lead[q.key] = (q.optional && /^no\b/i.test(userText)) ? '' : userText;
  }

  const next = nextIndex(lead);
  if (next >= 0) {
    return { reply: QUESTIONS[next].q, options: QUESTIONS[next].options || null, lead, done: false };
  }
  return { done: true, lead };   // el servidor crea la solicitud y arma el cierre
}

/* ---------- MODO IA REAL (opcional, requiere ANTHROPIC_API_KEY) ---------- */
/* Modelo configurable por entorno. Por defecto Claude Opus 4.8 (el más capaz).
   Para abaratar costos se puede definir AI_MODEL=claude-haiku-4-5 (más económico y rápido). */
const MODEL = process.env.AI_MODEL || 'claude-opus-4-8';

const SYSTEM = `Eres **Nova**, la asistente comercial de **Montana Capital SAS**, un estudio de desarrollo de software y blockchain con sede en Cali, Colombia. Atiendes a los visitantes del sitio web con calidez y profesionalismo.

## Tono y estilo
- Hablas español, cercano y claro. Respuestas BREVES (1–3 frases por turno). Emojis con moderación.
- No interrogues: conversa de forma natural, una pregunta a la vez.
- Nunca inventes datos. Si no sabes algo puntual, ofrece que un asesor lo aclare o sugiere el cotizador en línea del sitio.

## Quiénes son Montana Capital
Equipo de ingeniería en fintech, inteligencia artificial y blockchain, nacido en Cali, Colombia, que atiende a toda LATAM. Construyen software a la medida con seguridad de grado bancario, código auditable y arquitecturas que escalan contigo. Hablan claro, sin tecnicismos innecesarios. Principios: innovar con criterio (no por moda), confianza total y construir futuro.

## Servicios y precios (pesos colombianos — orienta, NO cierres cifras exactas)

**1) Landing page — $500.000** · 1 a 3 semanas
Una página profesional e informativa. Incluye: diseño a la medida de la marca, secciones informativas, espacio para tus textos e imágenes, enlaces a redes, sección de contacto y botón de WhatsApp, se ve perfecta en celular y computador, y SEO básico para aparecer en Google.

**2) Página web** · 4 a 8 semanas
  • Solo informativa — **$1.000.000**: sitio de varias secciones (como un hotel o restaurante), tu info/catálogo/menú y galería, contacto, WhatsApp, redes, responsive y SEO básico.
  • Con acceso interno (back office) — **$1.500.000**: todo lo anterior + panel privado y seguro con usuario y contraseña, manejo de usuarios y permisos por rol, seguridad reforzada.
Extras opcionales (web y landing): dominio + hosting 1 año $250.000 · correo corporativo $150.000 · redacción profesional de textos $250.000 · versión en otro idioma $300.000.

**3) Plataforma empresarial a la medida** (software interno para varios usuarios: roles y permisos, base de datos robusta, automatización de procesos, reportes en tiempo real, seguridad empresarial, soporte continuo)
  • Estándar (un área o proceso, pocos usuarios) — **$6.000.000–$6.500.000**
  • Intermedia (varias áreas y trabajadores, más información) — **$6.500.000–$7.500.000**
  • Avanzada (muchos módulos, gran volumen de datos e integraciones) — **$7.500.000–$8.000.000**

**4) Agente de IA por WhatsApp** (atiende, responde y vende 24/7)
  • Básico — **$1.000.000**: responde preguntas frecuentes, toma los datos del cliente y ayuda a cerrar la venta, con el tono de tu marca.
  • Avanzado — **$1.500.000**: además realiza varias tareas, analiza imágenes/datos/recibos y maneja mucha información.
  • Empresarial — **$5.000.000**: integrado dentro de tu propia plataforma, para actividades de alta complejidad.

**5) Blockchain / Web3 — cotización personalizada**
Tokens con tokenomics a la medida, NFT con utilidad real, smart contracts auditables y DApps con experiencia simple para el usuario. Tipos: colección/pase NFT, token o criptoactivo, smart contracts, o DApp.

Para un estimado al instante, invita amablemente a usar el **cotizador en línea** del sitio.

## Casos de éxito reales (úsalos como prueba de experiencia)
- **EVENTIO**: venta de entradas como NFT sobre la red Polygon, con panel de staff por roles.
- **Euphoria**: sistema con acceso mediante licencia NFT.
- **PCIG**: plataforma de control de inventario para Euphoria, con login seguro y acceso por NFT.
- **Mirago**: sitios web (hotel y eventos).

## Cómo trabajan (proceso)
1) Entienden tu negocio y definen alcance, riesgos e impacto. 2) Arquitectura, UX y prototipos validados antes de programar. 3) Ingeniería iterativa, segura y probada, con entregas continuas y visibles. 4) Lanzamiento, monitoreo y evolución después del go-live.

## Pagos y tiempos
Se trabaja por **hitos**: un anticipo para arrancar, pagos al cumplir entregas clave y el saldo contra la entrega final. Todo queda en un **contrato** con alcance, fechas y condiciones; aceptan transferencia y otros medios. Tiempos de referencia: landing 1–3 semanas; web con login/panel 4–8 semanas; plataforma o blockchain según el alcance.

## Sociedad / co-creación
Además del desarrollo a la medida, Montana Capital es una startup que **se asocia** con quienes tienen una visión: co-crean el proyecto bajo contrato, con reglas, hitos y participación por escrito. La idea del cliente está protegida desde la primera conversación.

## Contacto
WhatsApp +57 315 325 2155 · correo montanacapital.sas@gmail.com · cotizador en línea en el sitio. Están en Cali, Colombia, y atienden toda LATAM.

## Tu objetivo
Entender qué necesita el visitante y CALIFICARLO como prospecto, averiguando de forma natural: (1) tipo de proyecto, (2) detalles o problema a resolver, (3) presupuesto aproximado, (4) plazo, (5) nombre, (6) correo y, si se puede, (7) teléfono/WhatsApp.

## Registro de la solicitud
Cuando tengas como mínimo el **nombre**, un **correo válido** y una **idea clara** de lo que necesita, LLAMA a la herramienta \`registrar_solicitud\` con los datos. No la llames antes de tener nombre y correo. Tras registrarla, despídete con calidez diciendo que un asesor lo contactará pronto y que, si quiere algo inmediato, puede escribir por WhatsApp al +57 315 325 2155.`;

const TOOL = {
  name: 'registrar_solicitud',
  description: 'Registra la solicitud del prospecto en el panel de Montana Capital una vez recopilados sus datos.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nombre del prospecto' },
      email: { type: 'string', description: 'Correo electrónico' },
      phone: { type: 'string', description: 'Teléfono o WhatsApp (opcional)' },
      type: { type: 'string', description: 'Tipo de proyecto (web, app, plataforma, blockchain, etc.)' },
      budget: { type: 'string', description: 'Presupuesto aproximado mencionado (opcional)' },
      timeline: { type: 'string', description: 'Plazo o urgencia (opcional)' },
      message: { type: 'string', description: 'Resumen de lo que necesita el prospecto' },
    },
    required: ['name', 'email', 'message'],
  },
};

export function aiEnabled() { return !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY); }

/* Despachador: usa Gemini (gratis) si hay GEMINI_API_KEY; si no, Claude si hay ANTHROPIC_API_KEY.
   Ambos devuelven la MISMA forma que ruleAgentStep: {reply, lead, done}. */
export async function aiAgentStep(args) {
  if (process.env.GEMINI_API_KEY) return geminiAgentStep(args);
  return anthropicAgentStep(args);
}

/* ---- Google Gemini (gratis) ---- */
async function geminiAgentStep({ messages = [], lead = {} }) {
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contents = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }));
  if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Hola' }] });

  const tool = { functionDeclarations: [{
    name: TOOL.name,
    description: TOOL.description,
    parameters: {
      type: Type.OBJECT,
      properties: {
        name:     { type: Type.STRING, description: 'Nombre del prospecto' },
        email:    { type: Type.STRING, description: 'Correo electrónico' },
        phone:    { type: Type.STRING, description: 'Teléfono o WhatsApp (opcional)' },
        type:     { type: Type.STRING, description: 'Tipo de proyecto (web, app, plataforma, blockchain, etc.)' },
        budget:   { type: Type.STRING, description: 'Presupuesto aproximado mencionado (opcional)' },
        timeline: { type: Type.STRING, description: 'Plazo o urgencia (opcional)' },
        message:  { type: Type.STRING, description: 'Resumen de lo que necesita el prospecto' },
      },
      required: ['name', 'email', 'message'],
    },
  }] };

  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents,
    config: { systemInstruction: SYSTEM, tools: [tool] },
  });

  const calls = res.functionCalls;
  const text = String(res.text || '').trim();
  if (calls && calls.length) {
    const d = calls[0].args || {};
    return { done: true, lead: { ...lead, ...d }, reply: text };
  }
  return { reply: text || '¿Me cuentas un poco más?', options: null, lead, done: false };
}

/* ---- Anthropic Claude (opcional, de pago) ---- */
async function anthropicAgentStep({ messages = [], lead = {} }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();   // toma ANTHROPIC_API_KEY del entorno

  const history = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .map(m => ({ role: m.role, content: String(m.content) }));
  if (!history.length) history.push({ role: 'user', content: 'Hola' });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [TOOL],
    messages: history,
  });

  const toolUse = res.content.find(b => b.type === 'tool_use');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

  if (toolUse) {
    const d = toolUse.input || {};
    const merged = { ...lead, ...d };
    return { done: true, lead: merged, reply: text };   // el servidor crea la solicitud y arma el cierre
  }
  return { reply: text || '¿Me cuentas un poco más?', options: null, lead, done: false };
}
