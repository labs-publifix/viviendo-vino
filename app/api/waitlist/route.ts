import { Resend } from "resend";
import { renderConfirmationEmail } from "@/lib/email/confirmation";
import { isRateLimited } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { unsubscribeToken } from "@/lib/tokens";
import { EMAIL_ERROR } from "@/lib/messages";
import { signupSchema } from "@/lib/waitlist-schema";
import { normalizeWineTypes, type WineType } from "@/lib/wine-types";

const MIN_FILL_MS = 2500;
const TABLE = "waitlist_signups";

const ok = () => Response.json({ ok: true });
const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return fail(429, "Demasiados intentos. Espera unos minutos y vuelve a probar.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, EMAIL_ERROR);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const emailIssue = parsed.error.issues.some((issue) => issue.path[0] === "email");
    return fail(400, emailIssue ? EMAIL_ERROR : "No pudimos leer tu registro. Recarga la página e intenta de nuevo.");
  }
  const { email, source, website, startedAt } = parsed.data;
  const wineTypes = normalizeWineTypes(parsed.data.wineTypes);

  // Bot: responde éxito sin guardar nada.
  if (website || (startedAt !== undefined && Date.now() - startedAt < MIN_FILL_MS)) return ok();

  const db = supabaseAdmin();
  const inserted = await db
    .from(TABLE)
    .insert({ email, wine_types: wineTypes, source: source ?? null, consent: true })
    .select("id")
    .single();

  if (inserted.error) {
    // 23505: el correo ya estaba registrado. No lo revelamos y no reenviamos la confirmación.
    if (inserted.error.code === "23505") {
      if (wineTypes.length > 0) {
        const updated = await db.from(TABLE).update({ wine_types: wineTypes }).eq("email", email);
        if (updated.error) console.error("waitlist: no se actualizaron los gustos", updated.error.code);
      }
      return ok();
    }
    console.error("waitlist: error al guardar el registro", inserted.error.code, inserted.error.message);
    return fail(500, "Algo salió mal de nuestro lado. Intenta de nuevo en un momento.");
  }

  await sendConfirmation(inserted.data.id as string, email, wineTypes);
  return ok();
}

async function sendConfirmation(id: string, email: string, wineTypes: WineType[]) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error("Faltan RESEND_API_KEY o EMAIL_FROM");

    const unsubscribeUrl = `${SITE_URL}/api/waitlist/unsubscribe?token=${encodeURIComponent(unsubscribeToken(id))}`;
    const { subject, html, text } = renderConfirmationEmail({ wineTypes, unsubscribeUrl });
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: email,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (error) throw new Error(`${error.name}: ${error.message}`);

    const marked = await supabaseAdmin()
      .from(TABLE)
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", id);
    if (marked.error) console.error("waitlist: no se marcó confirmation_sent_at", id, marked.error.code);
  } catch (err) {
    // El registro se conserva; solo dejamos rastro en logs (sin el correo).
    console.error("waitlist: falló el correo de confirmación", id, err instanceof Error ? err.message : err);
  }
}
