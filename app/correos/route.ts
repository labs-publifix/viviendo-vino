import { renderConfirmationEmail } from "@/lib/email/confirmation";
import { escapeHtml } from "@/lib/email/brand-layout";
import { SEQUENCE, renderSequenceEmail } from "@/lib/email/sequence";
import { capitalize, longDay, timeOfDay } from "@/lib/launch";

// Vista previa de los correos para revisión del equipo: /correos y /correos?correo=e1…e6.
// Datos de ejemplo; no envía nada ni lee la base de datos.

const SAMPLE_UNSUBSCRIBE = "#baja";

function when(ms: number) {
  return `${capitalize(longDay(ms))}, ${timeOfDay(ms)}`;
}

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("correo");

  if (id === "e1") return html(renderConfirmationEmail({ wineTypes: ["blancos", "tintos"], unsubscribeUrl: SAMPLE_UNSUBSCRIBE }).html);
  const step = SEQUENCE.find((s) => s.id === id);
  if (step) return html(renderSequenceEmail(step, SAMPLE_UNSUBSCRIBE).html);

  const rows = [
    { id: "e1", when: "Al registrarse", audience: "Cada registro", subject: renderConfirmationEmail({ wineTypes: [], unsubscribeUrl: "" }).subject },
    ...SEQUENCE.map((s) => ({
      id: s.id,
      when: when(s.sendAtMs),
      audience: s.audience === "all" ? "Toda la lista" : "Solo quien aún no compra",
      subject: s.subject,
    })),
  ];
  return html(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Correos · Viviendo Vino</title>
<style>body{margin:0;padding:32px 16px;background:#f3ece4;color:#0a0206;font:16px/1.5 Helvetica,Arial,sans-serif}
main{max-width:640px;margin:0 auto}h1{font-size:28px;margin:0 0 8px}p{color:#5c5454;margin:0 0 24px}
a{display:block;padding:16px 0;border-top:1px solid rgb(10 2 6/.14);color:inherit;text-decoration:none}
b{display:block}span{color:#5c5454;font-size:14px}</style></head><body><main>
<h1>Secuencia de correos</h1><p>Vista previa con datos de ejemplo. Toca un correo para verlo.</p>
${rows.map((r) => `<a href="?correo=${r.id}"><b>${r.id.slice(1)}. ${escapeHtml(r.subject)}</b><span>${escapeHtml(r.when)} · ${escapeHtml(r.audience)}</span></a>`).join("\n")}
</main></body></html>`);
}
