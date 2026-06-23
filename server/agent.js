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
const SYSTEM = `Eres Nova, la asistente comercial de Montana Capital SAS, una empresa de desarrollo de software y blockchain en Cali, Colombia (sitios web, apps, plataformas a la medida, NFT, smart contracts y agentes de IA).

Tu objetivo: atender al visitante con calidez, entender qué necesita y CALIFICARLO como prospecto. Conversa en español, breve y amable (1–3 frases por turno, usa emojis con moderación).

Debes averiguar, de forma natural y sin interrogar: (1) qué tipo de proyecto quiere, (2) detalles o el problema a resolver, (3) presupuesto aproximado, (4) plazo, (5) su nombre, (6) su correo, y si se puede, (7) un teléfono/WhatsApp.

Precios de referencia (COP): landing $500.000; web + login/plataforma $1M–$1.5M; plataforma integral $6M–$10M; blockchain se cotiza aparte. Puedes orientar, pero no cierres precios exactos.

Cuando ya tengas como mínimo el nombre, un correo válido y una idea clara de lo que necesita, LLAMA a la herramienta registrar_solicitud con los datos recopilados. No la llames antes de tener nombre y correo. Tras registrarla, despídete agradeciendo y diciendo que un asesor lo contactará pronto.`;

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

export function aiEnabled() { return !!process.env.ANTHROPIC_API_KEY; }

/* devuelve la MISMA forma que ruleAgentStep: {reply, lead, done} */
export async function aiAgentStep({ messages = [], lead = {} }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();   // toma ANTHROPIC_API_KEY del entorno

  const history = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .map(m => ({ role: m.role, content: String(m.content) }));
  if (!history.length) history.push({ role: 'user', content: 'Hola' });

  const res = await client.messages.create({
    model: 'claude-opus-4-8',
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
