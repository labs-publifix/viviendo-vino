import { Resend } from "resend";
import { CONTACTO, CONTACTO_BUZON } from "@/lib/contacto";
import { LIMITE_IP, contactoSchema, erroresContacto, esBot } from "@/lib/contacto-form";
import { renderContactoConfirmacion, renderContactoEquipo } from "@/lib/email/contacto";
import { isRateLimited } from "@/lib/rate-limit";

// Formulario de /contacto. Valida en el servidor (aunque el navegador ya lo hizo), frena bots (campo oculto, tiempo
// mínimo de llenado y 5 envíos por hora por IP) y manda dos correos con Resend: al buzón de Viviendo Vino, con
// "responder a" la persona, y la confirmación a quien escribió. Los mensajes no se guardan en la base de datos.

const ok = () => Response.json({ ok: true });
const fail = (status: number, error: string, fieldErrors?: object) => Response.json({ ok: false, error, fieldErrors }, { status });
const NO_SE_ENVIO = `No pudimos enviar tu mensaje. Escríbenos por WhatsApp al ${CONTACTO.whatsapp.texto} o al correo ${CONTACTO.correo.texto}.`;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`contacto:${ip}`, Date.now(), LIMITE_IP)) {
    return fail(429, `Recibimos varios mensajes desde tu conexión. Espera un rato o escríbenos por WhatsApp al ${CONTACTO.whatsapp.texto}.`);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "No pudimos leer tu mensaje. Recarga la página e intenta de nuevo.");
  }
  // Bot: responde éxito sin enviar nada.
  if (esBot(body?.sitio, body?.inicio)) return ok();

  const parsed = contactoSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Revisa los campos marcados.", erroresContacto(parsed.error));
  const datos = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("contacto: faltan RESEND_API_KEY o EMAIL_FROM");
    return fail(502, NO_SE_ENVIO);
  }
  const resend = new Resend(apiKey);

  // 1. Al buzón de Viviendo Vino. Si este falla, el mensaje no llegó: se avisa a la persona.
  const equipo = renderContactoEquipo(datos);
  const enviado = await resend.emails.send({ from, to: CONTACTO_BUZON, replyTo: datos.correo, ...equipo }).catch((e: unknown) => ({ data: null, error: e as Error }));
  if (enviado.error) {
    // Sin datos de la persona en los logs.
    console.error("contacto: no se envió al buzón", enviado.error.name);
    return fail(502, NO_SE_ENVIO);
  }

  // 2. Confirmación a quien escribió. Si falla, su mensaje ya llegó: no se le muestra error.
  const confirmacion = renderContactoConfirmacion(datos);
  const conf = await resend.emails.send({ from, to: datos.correo, replyTo: CONTACTO_BUZON, ...confirmacion }).catch((e: unknown) => ({ data: null, error: e as Error }));
  if (conf.error) console.error("contacto: no se envió la confirmación", conf.error.name);

  return ok();
}
