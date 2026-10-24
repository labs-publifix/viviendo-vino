import "server-only";
import { SITE_URL } from "@/lib/site";

// Plantilla de marca para todos los correos (lista de espera y guías del blog) (tablas + estilos en línea,
// compatible con Gmail, Outlook y Apple Mail). Ajustada al Manual de identidad:
// hueso, negro tinto y vino; titulares en Arial/Helvetica Bold; botón píldora.

const FONT = "Helvetica,Arial,sans-serif";
export const LOGO_PATH = "/email/logo-viviendo-vino.png";
export const LOGO_URL = `${SITE_URL}${LOGO_PATH}`;

export type BrandEmail = {
  /** <title> del HTML y asunto sugerido. */
  title: string;
  /** Texto de vista previa en la bandeja de entrada. */
  preheader: string;
  eyebrow: string;
  heading: string;
  /** Bloque entre líneas: etiqueta pequeña, dato grande en vino y notas. */
  highlight?: { label: string; value: string; sub?: string; note?: string };
  /** Párrafos del cuerpo, en texto plano (se escapan). */
  paragraphs: string[];
  cta: { label: string; url: string };
  /** Enlace de baja; los correos que no son de la lista (p. ej. una guía pedida) no lo llevan. */
  unsubscribeUrl?: string;
  /** Por qué recibe el correo. Por omisión, el texto de la lista de espera. */
  reason?: string;
};

const WAITLIST_REASON = "Recibes este correo porque te registraste en la lista de espera en viviendovino.com.";

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function highlightHtml(h: NonNullable<BrandEmail["highlight"]>): string {
  return `
        <!-- Dato destacado -->
        <tr>
          <td class="px" style="padding:32px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #d7d0c9;border-bottom:1px solid #d7d0c9;">
              <tr>
                <td align="center" style="padding:24px 12px;">
                  <p style="margin:0 0 8px 0;font-family:${FONT};font-size:11px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5c5454;">${escapeHtml(h.label)}</p>
                  <p class="date" style="margin:0;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.3px;color:#9a2030;">${escapeHtml(h.value)}</p>${
                    h.sub
                      ? `
                  <p style="margin:6px 0 0 0;font-family:${FONT};font-size:14px;line-height:20px;font-weight:400;color:#5c5454;">${escapeHtml(h.sub)}</p>`
                      : ""
                  }${
                    h.note
                      ? `
                  <p style="margin:16px 0 0 0;font-family:${FONT};font-size:14px;line-height:21px;font-weight:700;color:#0a0206;">${escapeHtml(h.note)}</p>`
                      : ""
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
`;
}

export function renderBrandEmail(email: BrandEmail): { html: string; text: string } {
  const paragraphs = email.paragraphs
    .map((p, i) => `<p style="margin:${i === email.paragraphs.length - 1 ? "0" : "0 0 18px 0"};">${escapeHtml(p)}</p>`)
    .join("\n            ");

  const html = `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(email.title)}</title>
<!--[if mso]><style>td,p,h1,a{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
<style>
  body { margin: 0; padding: 0; }
  img { border: 0; outline: none; text-decoration: none; display: block; }
  a { color: #9a2030; }
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 28px !important; line-height: 34px !important; }
    .date { font-size: 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#e5ded7;">

<!-- Preheader: texto de vista previa en la bandeja de entrada -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#e5ded7;font-size:1px;line-height:1px;">
  ${escapeHtml(email.preheader)}
  &#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e5ded7;">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#f3ece4;border:1px solid #d7d0c9;border-top:4px solid #9a2030;">

        <!-- Logo -->
        <tr>
          <td align="center" class="px" style="padding:44px 40px 0 40px;">
            <img src="${LOGO_URL}" width="240" alt="Viviendo Vino" style="width:240px;height:auto;margin:0 auto;">
          </td>
        </tr>

        <!-- Línea de acento -->
        <tr>
          <td align="center" style="padding:40px 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td width="32" height="1" style="width:32px;height:1px;line-height:1px;font-size:1px;background-color:#9a2030;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- Eyebrow + titular -->
        <tr>
          <td align="center" class="px" style="padding:0 40px;">
            <p style="margin:0 0 14px 0;font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#0a0206;">${escapeHtml(email.eyebrow)}</p>
            <h1 class="h1" style="margin:0;font-family:${FONT};font-size:34px;line-height:40px;font-weight:700;letter-spacing:-0.5px;color:#0a0206;">${escapeHtml(email.heading)}</h1>
          </td>
        </tr>
${email.highlight ? highlightHtml(email.highlight) : ""}
        <!-- Cuerpo -->
        <tr>
          <td class="px" style="padding:32px 40px 0 40px;font-family:${FONT};font-size:16px;line-height:26px;font-weight:400;color:#0a0206;">
            ${paragraphs}
          </td>
        </tr>

        <!-- Botón -->
        <tr>
          <td align="center" class="px" style="padding:36px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#9a2030" style="background-color:#9a2030;border-radius:999px;">
                  <a href="${email.cta.url}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:#f3ece4;text-decoration:none;border-radius:999px;">${escapeHtml(email.cta.label)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td align="center" class="px" style="padding:44px 40px 36px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #d7d0c9;">
              <tr>
                <td align="center" style="padding-top:24px;font-family:${FONT};font-size:12px;line-height:19px;font-weight:400;color:#5c5454;">
                  <p style="margin:0 0 6px 0;">Viviendo Vino · Tienda en línea · Consumo exclusivo para mayores de edad.</p>
                  <p style="margin:0;">${escapeHtml(email.reason ?? WAITLIST_REASON)}${
                    email.unsubscribeUrl
                      ? `<br>
                  <a href="${email.unsubscribeUrl}" style="color:#5c5454;text-decoration:underline;">Darme de baja</a>`
                      : ""
                  }</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>
`;

  const h = email.highlight;
  const text = [
    email.heading.toUpperCase(),
    "",
    ...(h ? [[h.label + ":", h.value, h.sub ? `(${h.sub})` : ""].filter(Boolean).join(" "), ...(h.note ? [h.note] : []), ""] : []),
    ...email.paragraphs.flatMap((p) => [p, ""]),
    `${email.cta.label}: ${email.cta.url}`,
    "",
    "--",
    "Viviendo Vino · Tienda en línea · Consumo exclusivo para mayores de edad.",
    email.reason ?? WAITLIST_REASON,
    ...(email.unsubscribeUrl ? [`Darme de baja: ${email.unsubscribeUrl}`] : []),
    "",
  ].join("\n");

  return { html, text };
}
