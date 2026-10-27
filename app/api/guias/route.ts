import { Resend } from "resend";
import { z } from "zod";
import { getArticle } from "@/lib/blog/content";
import { renderGuideEmail } from "@/lib/email/guide";
import { registrarCorreo } from "@/lib/email/registro";
import { EMAIL_ERROR } from "@/lib/messages";
import { isRateLimited } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailSchema } from "@/lib/waitlist-schema";

// Envía por correo la guía en PDF de un artículo del blog. El servidor decide qué PDF manda a partir del
// slug (nunca una URL que venga del navegador), guarda la solicitud y no revela si el correo ya la pidió.

const MIN_FILL_MS = 1500;
/** Máximo de envíos al mismo correo por hora, para que nadie use el formulario para llenar un buzón ajeno. */
const MAX_PER_EMAIL_HOUR = 3;

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,120}$/),
  email: emailSchema,
  consent: z.literal(true),
  marketing: z.boolean().default(false),
  website: z.string().max(200).optional(),
  startedAt: z.number().int().optional(),
});

const ok = () => Response.json({ ok: true });
const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`guia:${ip}`)) return fail(429, "Demasiados intentos. Espera unos minutos y vuelve a probar.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "No pudimos leer tu solicitud. Recarga la página e intenta de nuevo.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "email") return fail(400, EMAIL_ERROR);
    if (path === "consent") return fail(400, "Acepta el aviso de privacidad para recibir la guía.");
    return fail(400, "No pudimos leer tu solicitud. Recarga la página e intenta de nuevo.");
  }
  const { slug, email, marketing, website, startedAt } = parsed.data;

  // Bot: responde éxito sin guardar ni enviar.
  if (website || (startedAt !== undefined && Date.now() - startedAt < MIN_FILL_MS)) return ok();

  const article = await getArticle(slug);
  if (!article || article.tipo !== "guia" || !article.pdf) return fail(404, "Esta guía ya no está disponible.");

  const db = supabaseAdmin();
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await db
    .from("guide_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if (recent.error) {
    console.error("guias: no se pudo revisar el historial", recent.error.code);
    return fail(500, "Algo salió mal de nuestro lado. Intenta de nuevo en un momento.");
  }
  if ((recent.count ?? 0) >= MAX_PER_EMAIL_HOUR) return ok();

  const inserted = await db
    .from("guide_requests")
    .insert({ email, guide_slug: slug, marketing_consent: marketing })
    .select("id")
    .single();
  if (inserted.error) {
    console.error("guias: no se guardó la solicitud", inserted.error.code);
    return fail(500, "Algo salió mal de nuestro lado. Intenta de nuevo en un momento.");
  }
  const id = inserted.data.id as string;

  if (marketing) {
    // A la lista de correos; si ya estaba, no se toca su registro.
    const joined = await db.from("waitlist_signups").insert({ email, source: `guia:${slug}`.slice(0, 40), consent: true });
    if (joined.error && joined.error.code !== "23505") console.error("guias: no se agregó a la lista", id, joined.error.code);
  }

  // Los enlaces apuntan al mismo despliegue donde se pidió (dev o producción).
  const origin = process.env.VERCEL_ENV === "production" ? SITE_URL : new URL(request.url).origin;
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error("Faltan RESEND_API_KEY o EMAIL_FROM");
    const { subject, html, text } = renderGuideEmail({
      titulo: article.titulo,
      pdfUrl: `${origin}${article.pdf}`,
      articleUrl: `${origin}/blog/${slug}`,
    });
    const { data, error } = await new Resend(apiKey).emails.send({ from, to: email, subject, html, text });
    await registrarCorreo({ tipo: "guia", para: "cliente", destinatario: email, asunto: subject, referencia: slug, resultado: error ? { error: error.name } : { id: data?.id ?? null } });
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (err) {
    // Sin el correo en los logs: solo el id de la solicitud.
    console.error("guias: falló el envío", id, err instanceof Error ? err.message : err);
    return fail(502, "No pudimos enviarte la guía. Intenta de nuevo en un momento.");
  }

  const marked = await db.from("guide_requests").update({ sent_at: new Date().toISOString() }).eq("id", id);
  if (marked.error) console.error("guias: no se marcó sent_at", id, marked.error.code);
  return ok();
}
