import { Resend } from "resend";
import { z } from "zod";
import { renderQuizProfileEmail } from "@/lib/email/quiz-profile";
import { EMAIL_ERROR } from "@/lib/messages";
import { getQuizCatalog } from "@/lib/quiz/catalog";
import { perfilById } from "@/lib/quiz/config";
import { hashIp, overSaveCap } from "@/lib/quiz/guard";
import { buildResult } from "@/lib/quiz/result";
import { getStoredSession } from "@/lib/quiz/store";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailSchema } from "@/lib/waitlist-schema";

// POST /api/quiz/save-profile: correo opcional, solo después del resultado. Manda por Resend el resumen del
// perfil y de la caja, el enlace al resultado y la guía en PDF del perfil. El servidor decide qué PDF manda
// (nunca una URL del navegador) y no revela si el correo ya lo pidió. El correo no va a los logs.

const MIN_FILL_MS = 1200;
const MAX_PER_EMAIL_HOUR = 3;

const schema = z.object({
  quiz_id: z.string().uuid(),
  email: emailSchema,
  consent: z.literal(true),
  marketing: z.boolean().default(false),
  website: z.string().max(200).optional(),
  startedAt: z.number().int().optional(),
});

const ok = () => Response.json({ ok: true });
const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });
const SERVER_ERROR = "Algo salió mal de nuestro lado. Intenta de nuevo en un momento.";

export async function POST(request: Request) {
  if (overSaveCap(hashIp(request))) return fail(429, "Demasiados intentos. Espera un rato y vuelve a probar.");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "email") return fail(400, EMAIL_ERROR);
    if (path === "consent") return fail(400, "Acepta el aviso de privacidad para recibir tu perfil.");
    return fail(400, "No pudimos leer tu solicitud. Recarga la página e intenta de nuevo.");
  }
  const { quiz_id, email, marketing, website, startedAt } = parsed.data;
  // Bot: responde éxito sin guardar ni enviar.
  if (website || (startedAt !== undefined && Date.now() - startedAt < MIN_FILL_MS)) return ok();

  const session = await getStoredSession(quiz_id);
  if (!session) return fail(404, "Este resultado ya no está disponible. Haz el quiz de nuevo.");

  const db = supabaseAdmin();
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await db.from("quiz_saved_profiles").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
  if (recent.error) {
    console.error("quiz: no se pudo revisar el historial de correos", recent.error.code);
    return fail(500, SERVER_ERROR);
  }
  if ((recent.count ?? 0) >= MAX_PER_EMAIL_HOUR) return ok();

  const inserted = await db.from("quiz_saved_profiles").insert({ quiz_id: session.id, email, marketing_consent: marketing }).select("id").single();
  if (inserted.error) {
    console.error("quiz: no se guardó el correo", inserted.error.code);
    return fail(500, SERVER_ERROR);
  }
  const id = inserted.data.id as string;

  if (marketing) {
    const joined = await db.from("waitlist_signups").insert({ email, source: `quiz:${session.perfil}`.slice(0, 40), consent: true });
    if (joined.error && joined.error.code !== "23505") console.error("quiz: no se agregó a la lista", id, joined.error.code);
  }

  const perfil = perfilById(session.perfil)!;
  const store = await getQuizCatalog();
  const result = buildResult(session, store.info, store.groups, store.presets);
  // Los enlaces apuntan al mismo despliegue donde se pidió (dev o producción).
  const origin = process.env.VERCEL_ENV === "production" ? SITE_URL : new URL(request.url).origin;
  // public/guias/<guia>.pdf (npm run guides:build; tests/quiz.test.mjs revisa que existan los 6).
  const pdfUrl = `${origin}/guias/${perfil.guia}.pdf`;
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error("Faltan RESEND_API_KEY o EMAIL_FROM");
    const { subject, html, text } = renderQuizProfileEmail({
      perfil: perfil.nombre,
      frase: result.perfil.fraseCorta,
      regalo: result.regalo,
      kit: result.kit?.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })) ?? [],
      totalCentavos: result.kit?.totalCentavos ?? null,
      resultUrl: `${origin}/quiz/r/${session.id}?origen=correo`,
      pdfUrl,
    });
    const { error } = await new Resend(apiKey).emails.send({ from, to: email, subject, html, text });
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (err) {
    console.error("quiz: falló el envío", id, err instanceof Error ? err.message : err);
    return fail(502, "No pudimos enviarte el correo. Intenta de nuevo en un momento.");
  }

  await Promise.all([
    db.from("quiz_saved_profiles").update({ sent_at: new Date().toISOString() }).eq("id", id),
    db.from("quiz_sessions").update({ correo_guardado: true }).eq("id", session.id),
  ]).catch(() => undefined);
  return ok();
}
