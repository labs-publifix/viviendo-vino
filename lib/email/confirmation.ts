import "server-only";
import { capitalize, giftEnd, launch } from "@/lib/launch";
import { SITE_URL } from "@/lib/site";
import { wineTypesNote, type WineType } from "@/lib/wine-types";

// Correo 1: confirmación de registro en la lista de espera.
// Plantilla de marca (tablas + estilos en línea) ajustada al Manual de identidad:
// hueso, negro tinto y vino; titulares en Arial/Helvetica Bold; botón píldora.

export const CONFIRMATION_SUBJECT = "Ya estás en la lista de Viviendo Vino";

type Vars = Record<string, string>;

const FONT = "Helvetica,Arial,sans-serif";

const HTML = `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Ya estás en la lista de Viviendo Vino</title>
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
  Abrimos el {{LAUNCH_DATE}}. Compra en las primeras 48 horas y recibe un regalo sorpresa.
  &#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e5ded7;">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#f3ece4;border:1px solid #d7d0c9;border-top:4px solid #9a2030;">

        <!-- Logo -->
        <tr>
          <td align="center" class="px" style="padding:44px 40px 0 40px;">
            <img src="{{LOGO_URL}}" width="240" alt="Viviendo Vino" style="width:240px;height:auto;margin:0 auto;">
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
            <p style="margin:0 0 14px 0;font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#0a0206;">Ya estás en la lista</p>
            <h1 class="h1" style="margin:0;font-family:${FONT};font-size:34px;line-height:40px;font-weight:700;letter-spacing:-0.5px;color:#0a0206;">Ya estás dentro.</h1>
          </td>
        </tr>

        <!-- Apertura -->
        <tr>
          <td class="px" style="padding:32px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #d7d0c9;border-bottom:1px solid #d7d0c9;">
              <tr>
                <td align="center" style="padding:24px 12px;">
                  <p style="margin:0 0 8px 0;font-family:${FONT};font-size:11px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5c5454;">Abrimos</p>
                  <p class="date" style="margin:0;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.3px;color:#9a2030;">{{LAUNCH_DATE_LONG}}</p>
                  <p style="margin:6px 0 0 0;font-family:${FONT};font-size:14px;line-height:20px;font-weight:400;color:#5c5454;">{{LAUNCH_TIME}} · hora centro de México</p>
                  <p style="margin:16px 0 0 0;font-family:${FONT};font-size:14px;line-height:21px;font-weight:700;color:#0a0206;">Regalo sorpresa para compras hasta el {{GIFT_END_LONG}}, {{GIFT_END_TIME}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td class="px" style="padding:32px 40px 0 40px;font-family:${FONT};font-size:16px;line-height:26px;font-weight:400;color:#0a0206;">
            <p style="margin:0 0 18px 0;">Compra tu primer kit de 6 botellas en las primeras 48 horas y te enviamos un regalo sorpresa con tu pedido. Para que lo reconozcamos, compra con este mismo correo.</p>
            <p style="margin:0;">Mientras tanto, ve pensando tu primer kit: son 6 botellas y tú las armas.</p>
            {{WINE_TYPES_BLOCK}}
          </td>
        </tr>

        <!-- Botón -->
        <tr>
          <td align="center" class="px" style="padding:36px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#9a2030" style="background-color:#9a2030;border-radius:999px;">
                  <a href="{{SITE_URL}}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:#f3ece4;text-decoration:none;border-radius:999px;">Ver la cuenta regresiva</a>
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
                  <p style="margin:0 0 6px 0;">Viviendo Vino · Consumo exclusivo para mayores de edad.</p>
                  <p style="margin:0;">Recibes este correo porque te registraste en la lista de espera en viviendovino.com.<br>
                  <a href="{{UNSUBSCRIBE_URL}}" style="color:#5c5454;text-decoration:underline;">Darme de baja</a></p>
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

const TEXT = `YA ESTÁS DENTRO.

Abrimos el {{LAUNCH_DATE_LONG}} a las {{LAUNCH_TIME}} (hora centro de México).
Regalo sorpresa para compras hasta el {{GIFT_END_LONG}}, {{GIFT_END_TIME}}.

Compra tu primer kit de 6 botellas en las primeras 48 horas y te enviamos un regalo sorpresa con tu pedido. Para que lo reconozcamos, compra con este mismo correo.

Mientras tanto, ve pensando tu primer kit: son 6 botellas y tú las armas.
{{WINE_TYPES_TEXT}}
Ver la cuenta regresiva: {{SITE_URL}}

--
Viviendo Vino · Consumo exclusivo para mayores de edad.
Recibes este correo porque te registraste en la lista de espera en viviendovino.com.
Darme de baja: {{UNSUBSCRIBE_URL}}
`;

function fill(template: string, vars: Vars): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) => {
    if (!(key in vars)) throw new Error(`Variable sin valor en la plantilla: ${key}`);
    return vars[key];
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function wineTypesSentence(types: readonly WineType[]): string | null {
  const note = wineTypesNote(types);
  return note ? `${note} Lo tendremos presente para el primer kit.` : null;
}

export function renderConfirmationEmail(input: { wineTypes: readonly WineType[]; unsubscribeUrl: string }) {
  const sentence = wineTypesSentence(input.wineTypes);
  const vars: Vars = {
    LOGO_URL: `${SITE_URL}/email/logo-viviendo-vino.png`,
    SITE_URL,
    LAUNCH_DATE: launch.shortDay,
    LAUNCH_DATE_LONG: capitalize(launch.day),
    LAUNCH_TIME: launch.time,
    GIFT_END_LONG: giftEnd.day,
    GIFT_END_TIME: giftEnd.time,
    UNSUBSCRIBE_URL: input.unsubscribeUrl,
  };
  const html = fill(HTML, {
    ...vars,
    WINE_TYPES_BLOCK: sentence ? `<p style="margin:18px 0 0 0;">${escapeHtml(sentence)}</p>` : "",
  });
  // En texto plano la fecha va a media frase ("Abrimos el jueves 19 de noviembre"): sin mayúscula.
  const text = fill(TEXT, {
    ...vars,
    LAUNCH_DATE_LONG: launch.day,
    WINE_TYPES_TEXT: sentence ? `\n${sentence}\n` : "",
  });
  return { subject: CONFIRMATION_SUBJECT, html, text };
}
