import "server-only";
import { giftEnd, launch } from "@/lib/launch";
import { SITE_URL } from "@/lib/site";
import { wineTypesNote, type WineType } from "@/lib/wine-types";

// Correo 1: confirmación de registro en la lista de espera.
// Formato de carta firmada por Rafael (tablas + estilos en línea): se lee como un correo personal,
// con el logotipo pequeño dentro de la firma, para que Gmail lo trate menos como promoción.

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
<!--[if mso]><style>td,p,a{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
<style>
  body { margin: 0; padding: 0; }
  img { border: 0; outline: none; text-decoration: none; }
  a { color: #9a2030; }
  @media (max-width: 620px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">

<!-- Preheader: texto de vista previa en la bandeja de entrada -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#ffffff;font-size:1px;line-height:1px;">
  Abrimos el {{LAUNCH_DATE}}. Compra en las primeras 48 horas y recibe un regalo sorpresa.
  &#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
</div>

<!-- Correo con formato de carta: texto, firma de Rafael y el logotipo pequeño dentro de la firma. -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr>
    <td align="left" class="px" style="padding:32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- Cuerpo -->
        <tr>
          <td style="font-family:${FONT};font-size:16px;line-height:26px;color:#0a0206;">
            <p style="margin:0 0 18px 0;">Hola:</p>
            <p style="margin:0 0 18px 0;">Gracias por apuntarte a la lista de espera de Viviendo Vino. Ya estás dentro.</p>
            <p style="margin:0 0 18px 0;">Abrimos el <strong>{{LAUNCH_DATE_LONG}} a las {{LAUNCH_TIME}}</strong> (hora centro de México). Compra tu primer kit de 6 botellas en las primeras 48 horas, hasta el <strong>{{GIFT_END_LONG}}, {{GIFT_END_TIME}}</strong>, y te enviamos un regalo sorpresa con tu pedido. Para que lo reconozcamos, compra con este mismo correo.</p>
            <p style="margin:0 0 18px 0;">Mientras tanto, ve pensando tu primer kit: son 6 botellas y tú las armas.</p>
            {{WINE_TYPES_BLOCK}}
            <p style="margin:0 0 28px 0;">La cuenta regresiva está en <a href="{{SITE_URL}}" style="color:#9a2030;text-decoration:underline;">viviendovino.com</a>.</p>
            <p style="margin:0 0 20px 0;">Salud,</p>
          </td>
        </tr>

        <!-- Firma -->
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="top" style="padding:0 14px 0 0;">
                  <img src="{{PHOTO_URL}}" width="64" height="64" alt="Rafael Aguirre" style="display:block;width:64px;height:64px;border-radius:50%;">
                </td>
                <td valign="top" style="font-family:${FONT};font-size:15px;line-height:21px;color:#0a0206;">
                  <p style="margin:2px 0 2px 0;font-weight:700;">Rafael Aguirre</p>
                  <p style="margin:0 0 10px 0;color:#5c5454;">Viviendo Vino</p>
                  <a href="{{SITE_URL}}" style="text-decoration:none;"><img src="{{LOGO_URL}}" width="104" alt="Viviendo Vino" style="display:block;width:104px;height:auto;"></a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td style="padding-top:36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5ded7;">
              <tr>
                <td style="padding-top:16px;font-family:${FONT};font-size:12px;line-height:18px;color:#5c5454;">
                  <p style="margin:0 0 4px 0;">Viviendo Vino · Consumo exclusivo para mayores de edad.</p>
                  <p style="margin:0;">Recibes este correo porque te registraste en la lista de espera en viviendovino.com. <a href="{{UNSUBSCRIBE_URL}}" style="color:#5c5454;text-decoration:underline;">Darme de baja</a></p>
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

const TEXT = `Hola:

Gracias por apuntarte a la lista de espera de Viviendo Vino. Ya estás dentro.

Abrimos el {{LAUNCH_DATE_LONG}} a las {{LAUNCH_TIME}} (hora centro de México). Compra tu primer kit de 6 botellas en las primeras 48 horas, hasta el {{GIFT_END_LONG}}, {{GIFT_END_TIME}}, y te enviamos un regalo sorpresa con tu pedido. Para que lo reconozcamos, compra con este mismo correo.

Mientras tanto, ve pensando tu primer kit: son 6 botellas y tú las armas.
{{WINE_TYPES_TEXT}}
La cuenta regresiva está en {{SITE_URL}}

Salud,

Rafael Aguirre
Viviendo Vino

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
  return note ? `${note} Lo tendremos presente para tu primer kit.` : null;
}

export function renderConfirmationEmail(input: { wineTypes: readonly WineType[]; unsubscribeUrl: string }) {
  const sentence = wineTypesSentence(input.wineTypes);
  const vars: Vars = {
    LOGO_URL: `${SITE_URL}/email/logo-viviendo-vino.png`,
    SITE_URL,
    LAUNCH_DATE: launch.shortDay,
    PHOTO_URL: `${SITE_URL}/email/rafael-aguirre.jpg`,
    LAUNCH_DATE_LONG: launch.day,
    LAUNCH_TIME: launch.time,
    GIFT_END_LONG: giftEnd.day,
    GIFT_END_TIME: giftEnd.time,
    UNSUBSCRIBE_URL: input.unsubscribeUrl,
  };
  const html = fill(HTML, {
    ...vars,
    WINE_TYPES_BLOCK: sentence ? `<p style="margin:0 0 18px 0;">${escapeHtml(sentence)}</p>` : "",
  });
  const text = fill(TEXT, { ...vars, WINE_TYPES_TEXT: sentence ? `\n${sentence}\n` : "" });
  return { subject: CONFIRMATION_SUBJECT, html, text };
}
