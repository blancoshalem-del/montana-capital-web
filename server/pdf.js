// pdf.js — Generador de PDF de COTIZACIÓN con branding profesional
// para "Montana Capital SAS". Módulo ESM. Usa pdfkit.
//
// Exporta:  buildQuotePdf({ quote, client, meta }) -> Promise<Buffer>

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al logo (assets vive un nivel arriba de /server)
const LOGO_PATH = path.resolve(__dirname, "..", "assets", "logo-mark.png");

// ---------------------------------------------------------------------------
// Paleta de marca
// ---------------------------------------------------------------------------
const COLORS = {
  navy: "#16242f",
  navy2: "#1b2a38",
  blue: "#2a6bff",
  cyan: "#62d6ff",
  gold: "#e7c264",
  ink: "#243340",
  muted: "#6b7884",
  faint: "#9aa6b1",
  line: "#e4e9ee",
  lineSoft: "#eef2f6",
  card: "#f6f8fb",
  cardBorder: "#e7edf3",
  white: "#ffffff",
  zebra: "#f7f9fc",
};

// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------

// Formatea número COP con separador de miles "." y sin decimales -> "$1.200.000"
function formatCOP(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  const rounded = Math.round(Math.abs(n));
  const withDots = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = n < 0 ? "-" : "";
  return `${sign}$${withDots}`;
}

// Formatea fecha ISO (o Date) a es-CO largo -> "20 de junio de 2026"
function formatDateLong(iso) {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    // Fallback manual
    const meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
  }
}

// ---------------------------------------------------------------------------
// Generador principal
// ---------------------------------------------------------------------------
export async function buildQuotePdf({ quote, client, meta } = {}) {
  // Defensa: normaliza entradas para que nunca truene
  quote = quote || {};
  client = client || {};
  meta = meta || {};

  const items = Array.isArray(quote.items) ? quote.items : [];
  const currency = quote.currency || "COP";

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        info: {
          Title: `Cotización ${meta.quoteId || ""} — Montana Capital SAS`,
          Author: "Montana Capital SAS",
          Subject: "Cotización de proyecto",
        },
      });

      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Geometría de página
      const PW = doc.page.width; // ~595.28 (A4)
      const PH = doc.page.height; // ~841.89
      const M = 48; // margen lateral de contenido
      const CW = PW - M * 2; // ancho de contenido

      const HEADER_H = 118; // alto de la banda superior
      const FOOTER_H = 64; // alto del pie

      // -------------------------------------------------------------------
      // Util: dibuja cabecera y pie en la página actual
      // -------------------------------------------------------------------
      function drawHeader() {
        // Banda navy
        doc.save();
        doc.rect(0, 0, PW, HEADER_H).fill(COLORS.navy);
        // Acento inferior degradado (azul -> cian) como hairline
        const grad = doc.linearGradient(0, HEADER_H - 4, PW, HEADER_H - 4);
        grad.stop(0, COLORS.blue).stop(1, COLORS.cyan);
        doc.rect(0, HEADER_H - 4, PW, 4).fill(grad);
        doc.restore();

        // Logo
        const logoSize = 56;
        const logoY = (HEADER_H - 8 - logoSize) / 2;
        let textX = M;
        try {
          if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, M, logoY, {
              fit: [logoSize, logoSize],
              align: "left",
              valign: "center",
            });
            textX = M + logoSize + 16;
          }
        } catch {
          textX = M;
        }

        // Nombre de marca
        doc
          .fillColor(COLORS.white)
          .font("Helvetica-Bold")
          .fontSize(17)
          .text("MONTANA CAPITAL SAS", textX, logoY + 8, {
            characterSpacing: 0.5,
            lineBreak: false,
          });

        // Tagline
        doc
          .fillColor(COLORS.cyan)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("F I N T E C H   &   B L O C K C H A I N", textX, logoY + 32, {
            characterSpacing: 1.2,
            lineBreak: false,
          });

        // Bloque derecho: COTIZACIÓN / número / fecha
        const rightW = 200;
        const rightX = PW - M - rightW;
        doc
          .fillColor(COLORS.gold)
          .font("Helvetica-Bold")
          .fontSize(20)
          .text("COTIZACIÓN", rightX, logoY + 4, {
            width: rightW,
            align: "right",
            characterSpacing: 1,
          });

        const idText = meta.quoteId ? `N.° ${meta.quoteId}` : "";
        doc
          .fillColor("#cdd8e2")
          .font("Helvetica")
          .fontSize(9)
          .text(idText, rightX, logoY + 30, { width: rightW, align: "right" });

        doc
          .fillColor("#cdd8e2")
          .font("Helvetica")
          .fontSize(9)
          .text(formatDateLong(meta.date), rightX, logoY + 43, {
            width: rightW,
            align: "right",
          });
      }

      function drawFooter() {
        const fy = PH - FOOTER_H;
        doc.save();
        // hairline superior
        doc
          .moveTo(M, fy)
          .lineTo(PW - M, fy)
          .lineWidth(0.75)
          .strokeColor(COLORS.line)
          .stroke();

        doc
          .fillColor(COLORS.navy)
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(
            "WhatsApp +57 315 325 2155   ·   montanacapital.sas@gmail.com   ·   Cali, Colombia",
            M,
            fy + 14,
            { width: CW, align: "center", characterSpacing: 0.2 }
          );

        doc
          .fillColor(COLORS.muted)
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "INNOVAMOS HOY  ·  CONSTRUIMOS EL FUTURO",
            M,
            fy + 30,
            { width: CW, align: "center", characterSpacing: 1.5 }
          );

        // Acento dorado pequeño centrado
        doc
          .rect(PW / 2 - 18, fy + 44, 36, 2)
          .fill(COLORS.gold);
        doc.restore();
      }

      // Salto de página manteniendo branding y devolviendo nuevo cursorY
      function ensureSpace(needed, cursorY) {
        const limit = PH - FOOTER_H - 16;
        if (cursorY + needed > limit) {
          doc.addPage();
          drawHeader();
          drawFooter();
          return HEADER_H + 28;
        }
        return cursorY;
      }

      // Título de sección reutilizable
      function sectionTitle(label, cursorY) {
        doc
          .fillColor(COLORS.blue)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(label.toUpperCase(), M, cursorY, { characterSpacing: 1.3 });
        const ty = cursorY + 14;
        doc
          .moveTo(M, ty)
          .lineTo(M + 28, ty)
          .lineWidth(2)
          .strokeColor(COLORS.gold)
          .stroke();
        return ty + 12;
      }

      // Lista de viñetas (con salto de página)
      function bullets(arr, cursorY) {
        const list = Array.isArray(arr) ? arr : [];
        for (const item of list) {
          const txt = String(item || "");
          const tw = CW - 22;
          const h = Math.max(15, doc.heightOfString(txt, { width: tw, font: "Helvetica", fontSize: 10 }) + 6);
          cursorY = ensureSpace(h, cursorY);
          // punto
          doc.save();
          doc.circle(M + 4, cursorY + 6, 2.2).fill(COLORS.cyan);
          doc.restore();
          doc
            .fillColor(COLORS.ink)
            .font("Helvetica")
            .fontSize(10)
            .text(txt, M + 16, cursorY, { width: tw });
          cursorY += h;
        }
        return cursorY + 6;
      }

      // ===================================================================
      // PÁGINA 1
      // ===================================================================
      drawHeader();
      drawFooter();

      let y = HEADER_H + 30;

      // -------------------------------------------------------------------
      // BLOQUE CLIENTE — tarjeta suave
      // -------------------------------------------------------------------
      {
        const lines = [];
        if (client.name) lines.push({ k: "Nombre", v: client.name });
        if (client.company) lines.push({ k: "Empresa", v: client.company });
        if (client.email) lines.push({ k: "Correo", v: client.email });
        if (client.phone) lines.push({ k: "Teléfono", v: client.phone });
        if (client.city) lines.push({ k: "Ciudad", v: client.city });

        const pad = 16;
        const lineH = 15;
        const titleH = 18;
        const cardH = pad * 2 + titleH + Math.max(lines.length, 1) * lineH;

        // Tarjeta
        doc.save();
        doc.roundedRect(M, y, CW, cardH, 8).fill(COLORS.card);
        doc
          .roundedRect(M, y, CW, cardH, 8)
          .lineWidth(0.75)
          .strokeColor(COLORS.cardBorder)
          .stroke();
        // Barra de acento izquierda
        doc.save();
        doc.roundedRect(M, y, 4, cardH, 2).fill(COLORS.blue);
        doc.restore();
        doc.restore();

        let cy = y + pad;
        const labelX = M + pad + 6;
        doc
          .fillColor(COLORS.gold)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text("PREPARADA PARA", labelX, cy, { characterSpacing: 1.2 });
        cy += titleH;

        const keyW = 64;
        for (const ln of lines) {
          doc
            .fillColor(COLORS.muted)
            .font("Helvetica")
            .fontSize(9.5)
            .text(ln.k, labelX, cy, { width: keyW, lineBreak: false });
          doc
            .fillColor(COLORS.ink)
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .text(ln.v, labelX + keyW, cy, {
              width: CW - pad * 2 - keyW - 6,
              lineBreak: false,
              ellipsis: true,
            });
          cy += lineH;
        }

        y += cardH + 26;
      }

      // -------------------------------------------------------------------
      // RESUMEN DEL PROYECTO — tres chips
      // -------------------------------------------------------------------
      {
        y = sectionTitle("Tu servicio", y);

        const chips = [{ k: "Servicio", v: quote.package?.label || "—" }];
        if (quote.variant?.label) chips.push({ k: "Modalidad", v: quote.variant.label });
        const gap = 12;
        const n = chips.length;
        const chipW = (CW - gap * (n - 1)) / n;
        const chipH = 50;

        chips.forEach((c, i) => {
          const cx = M + i * (chipW + gap);
          doc.save();
          doc.roundedRect(cx, y, chipW, chipH, 7).fill(COLORS.white);
          doc.roundedRect(cx, y, chipW, chipH, 7).lineWidth(0.75).strokeColor(COLORS.line).stroke();
          doc.restore();
          doc.fillColor(COLORS.faint).font("Helvetica-Bold").fontSize(7.5)
            .text(c.k.toUpperCase(), cx + 12, y + 11, { width: chipW - 24, characterSpacing: 1 });
          doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(11)
            .text(c.v, cx + 12, y + 25, { width: chipW - 24, lineBreak: false, ellipsis: true });
        });

        y += chipH + 26;
      }

      // -------------------------------------------------------------------
      // TU SERVICIO INCLUYE
      // -------------------------------------------------------------------
      {
        y = sectionTitle("Tu servicio incluye", y);
        y = bullets(quote.includes, y);
        y += 8;
      }

      // Lo que quieres que tenga (informativo)
      if (Array.isArray(quote.features) && quote.features.length) {
        y = ensureSpace(46, y);
        y = sectionTitle("Lo que quieres que tenga", y);
        y = bullets(quote.features, y);
        y += 8;
      }

      // Extras seleccionados (con precio)
      if (Array.isArray(quote.addons) && quote.addons.length) {
        y = ensureSpace(70, y);
        y = sectionTitle("Extras seleccionados", y);
        const rowH = 26, valW = 150, concX = M + 16, valX = M + CW - valW - 16;
        let zebra = false;
        quote.addons.forEach((a) => {
          y = ensureSpace(rowH, y);
          if (zebra) { doc.save(); doc.rect(M, y, CW, rowH).fill(COLORS.zebra); doc.restore(); }
          doc.fillColor(COLORS.ink).font("Helvetica").fontSize(10)
            .text(a.label, concX, y + 8, { width: CW - valW - 48, lineBreak: false, ellipsis: true });
          doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10)
            .text(formatCOP(a.price), valX, y + 8, { width: valW, align: "right" });
          doc.moveTo(M, y + rowH).lineTo(M + CW, y + rowH).lineWidth(0.5).strokeColor(COLORS.lineSoft).stroke();
          y += rowH; zebra = !zebra;
        });
        y += 16;
      }

      // Observaciones del cliente
      if (quote.observations) {
        y = ensureSpace(56, y);
        y = sectionTitle("Tus observaciones", y);
        doc.fillColor(COLORS.ink).font("Helvetica-Oblique").fontSize(9.5)
          .text(quote.observations, M, y, { width: CW });
        y += doc.heightOfString(quote.observations, { width: CW }) + 16;
      }

      // -------------------------------------------------------------------
      // TOTAL ESTIMADO — bloque destacado
      // -------------------------------------------------------------------
      {
        const blockH = 78;
        y = ensureSpace(blockH + 70, y);

        doc.save();
        // Fondo navy con degradado
        const g = doc.linearGradient(M, y, M + CW, y + blockH);
        g.stop(0, COLORS.navy).stop(1, COLORS.navy2);
        doc.roundedRect(M, y, CW, blockH, 10).fill(g);
        // Borde dorado sutil
        doc
          .roundedRect(M, y, CW, blockH, 10)
          .lineWidth(1)
          .strokeColor(COLORS.gold)
          .stroke();
        doc.restore();

        // Etiqueta
        doc
          .fillColor(COLORS.gold)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(quote.custom ? "INVERSIÓN" : "TOTAL ESTIMADO", M + 22, y + 16, { characterSpacing: 1.5 });

        // Rango grande
        const rangeText = quote.rangeText || "—";
        doc
          .fillColor(COLORS.white)
          .font("Helvetica-Bold")
          .fontSize(rangeText.length > 24 ? 20 : 24)
          .text(rangeText, M + 22, y + 32, {
            width: CW - 44,
            lineBreak: false,
            ellipsis: true,
          });

        // Moneda a la derecha (no aplica en cotización personalizada)
        if (!quote.custom) {
          doc
            .fillColor(COLORS.cyan)
            .font("Helvetica-Bold")
            .fontSize(10)
            .text(currency, M + 22, y + 16, {
              width: CW - 44,
              align: "right",
            });
        }

        y += blockH + 14;

        // Nota + validez (letra pequeña)
        if (quote.note) {
          doc
            .fillColor(COLORS.muted)
            .font("Helvetica")
            .fontSize(8.5)
            .text(quote.note, M + 4, y, { width: CW - 8 });
          y += doc.heightOfString(quote.note, { width: CW - 8 }) + 4;
        }

        const validDays = quote.validDays != null ? quote.validDays : "";
        const validUntil = formatDateLong(meta.validUntil);
        const validLine =
          validUntil || validDays !== ""
            ? `Cotización válida por ${validDays} días${
                validUntil ? ` (hasta ${validUntil})` : ""
              }.`
            : "";
        if (validLine) {
          doc
            .fillColor(COLORS.navy)
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .text(validLine, M + 4, y, { width: CW - 8 });
          y += 16;
        }
      }

      // -------------------------------------------------------------------
      // NOTA LEGAL
      // -------------------------------------------------------------------
      {
        y += 8;
        y = ensureSpace(34, y);
        doc
          .moveTo(M, y)
          .lineTo(M + CW, y)
          .lineWidth(0.5)
          .strokeColor(COLORS.line)
          .stroke();
        y += 10;
        doc
          .fillColor(COLORS.faint)
          .font("Helvetica-Oblique")
          .fontSize(7.8)
          .text(
            "Estimación referencial sujeta al alcance final acordado. No constituye un contrato.",
            M,
            y,
            { width: CW, align: "center" }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default buildQuotePdf;
