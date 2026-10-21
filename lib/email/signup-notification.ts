import "server-only";
import { TIME_ZONE } from "@/lib/launch";
import { WINE_TYPE_LABELS, type WineType } from "@/lib/wine-types";

// Aviso interno al equipo cada vez que alguien nuevo entra a la lista de espera.

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Destinatarios desde WAITLIST_NOTIFY_TO, separados por coma. */
export function notifyRecipients(): string[] {
  return (process.env.WAITLIST_NOTIFY_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function renderSignupNotification(input: {
  email: string;
  wineTypes: readonly WineType[];
  source: string | null;
  total: number | null;
  at: Date;
}) {
  const when = new Intl.DateTimeFormat("es-MX", {
    timeZone: TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(input.at);
  const tastes = input.wineTypes.length ? input.wineTypes.map((t) => WINE_TYPE_LABELS[t]).join(", ") : "Sin elegir";
  const rows: [string, string][] = [
    ["Correo", input.email],
    ["Gustos", tastes],
    ["Fuente", input.source ?? "Directo"],
    ["Fecha", `${when} (hora centro de México)`],
  ];
  if (input.total !== null) rows.push(["Total en la lista", String(input.total)]);

  const subject = input.total !== null ? `Nuevo registro en la lista de espera (#${input.total})` : "Nuevo registro en la lista de espera";
  const text = `Nuevo registro en la lista de espera de Viviendo Vino.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:#0a0206;">
<p style="margin:0 0 16px 0;font-weight:700;">Nuevo registro en la lista de espera de Viviendo Vino.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5c5454;">${k}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`).join("\n")}
</table>
</div>`;
  return { subject, html, text };
}
