import "server-only";
import { CONTACTO } from "@/lib/contacto";
import { textoMotivo, type ContactoDatos } from "@/lib/contacto-form";
import { SITE_URL } from "@/lib/site";
import { escapeHtml, renderBrandEmail } from "./brand-layout";

// Correos del formulario de /contacto: el aviso al buzón de Viviendo Vino (responde directo a la persona) y la
// confirmación para quien escribió, con la plantilla de marca.

export function renderContactoEquipo(d: ContactoDatos) {
  const motivo = textoMotivo(d.motivo);
  const subject = `[Contacto web] ${motivo} — ${d.nombre}`.slice(0, 200);
  const filas: [string, string][] = [
    ["Nombre", d.nombre],
    ...(d.empresa ? ([["Empresa", d.empresa]] as [string, string][]) : []),
    ["Correo", d.correo],
    ["Teléfono", d.telefono || "—"],
    ["Motivo", motivo],
  ];
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f3ece4;font-family:Helvetica,Arial,sans-serif;color:#0a0206;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#faf6f1;border:1px solid #d7d0c9;border-radius:12px;">
<tr><td style="padding:24px 28px;">
<p style="margin:0 0 4px 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9a2030;font-weight:700;">Contacto web</p>
<h1 style="margin:0 0 20px 0;font-size:22px;line-height:28px;">${escapeHtml(motivo)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:15px;line-height:22px;">
${filas.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5c5454;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`).join("\n")}
</table>
<p style="margin:20px 0 6px 0;color:#5c5454;font-size:13px;">Mensaje</p>
<p style="margin:0;font-size:15px;line-height:23px;white-space:pre-wrap;">${escapeHtml(d.mensaje)}</p>
<p style="margin:24px 0 0 0;color:#5c5454;font-size:13px;">Responde a este correo para contestarle directamente.</p>
</td></tr></table></body></html>`;
  const text = [...filas.map(([k, v]) => `${k}: ${v}`), "", "Mensaje:", d.mensaje, "", "Responde a este correo para contestarle directamente."].join("\n");
  return { subject, html, text };
}

export const CONTACTO_CONFIRMACION_ASUNTO = "Recibimos tu mensaje · Viviendo Vino";

export function renderContactoConfirmacion(d: ContactoDatos) {
  const { html, text } = renderBrandEmail({
    title: CONTACTO_CONFIRMACION_ASUNTO,
    preheader: "Recibimos tu mensaje. Te respondemos en nuestro horario de atención.",
    eyebrow: "Contacto",
    heading: `Gracias, ${d.nombre.split(" ")[0]}.`,
    paragraphs: [
      "Recibimos tu mensaje. Te respondemos en nuestro horario de atención: lunes a viernes, de 9:00 a 18:00 (hora CDMX).",
      `Si necesitas algo antes, llámanos al ${CONTACTO.telefono.texto}.`,
    ],
    cta: { label: "Volver a Viviendo Vino", url: SITE_URL },
    reason: "Recibes este correo porque nos escribiste desde el formulario de contacto de viviendovino.com.",
  });
  return { subject: CONTACTO_CONFIRMACION_ASUNTO, html, text };
}
