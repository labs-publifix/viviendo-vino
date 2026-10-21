import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { SEQUENCE, renderSequenceEmail, type SequenceStep } from "@/lib/email/sequence";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { unsubscribeToken } from "@/lib/tokens";

// Envía los correos 2 a 6 cuando les toca. Lo llama cada hora un workflow de GitHub Actions
// (.github/workflows/email-sequence.yml) con el encabezado Authorization: Bearer CRON_SECRET.
// Es idempotente: cada envío se registra en waitlist_email_sends antes de mandarse.
// Mientras WAITLIST_SEQUENCE_ENABLED no sea "true", solo reporta qué enviaría (sin enviar).

export const maxDuration = 300;

/** Si el cron no corrió a tiempo, el correo todavía sale dentro de este margen; después se omite. */
const GRACE_MS = 6 * 3600 * 1000;
const BATCH_SIZE = 100;
const PAGE = 1000;

type Signup = { id: string; email: string };
type StepReport = { step: string; name: string; sendAt: string; pending: number; sent: number; failed: number };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

async function eligibleSignups(step: SequenceStep): Promise<Signup[]> {
  const db = supabaseAdmin();
  const cutoff = new Date(step.sendAtMs).toISOString();
  const signups: Signup[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = db
      .from("waitlist_signups")
      .select("id, email")
      .is("unsubscribed_at", null)
      .lte("created_at", cutoff);
    if (step.audience === "not_purchased") query = query.is("purchased_at", null);
    const { data, error } = await query.order("created_at").range(from, from + PAGE - 1);
    if (error) throw new Error(`signups: ${error.code} ${error.message}`);
    signups.push(...(data as Signup[]));
    if (data.length < PAGE) break;
  }

  const sent = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("waitlist_email_sends")
      .select("signup_id")
      .eq("step", step.id)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`sends: ${error.code} ${error.message}`);
    for (const row of data) sent.add(row.signup_id as string);
    if (data.length < PAGE) break;
  }
  return signups.filter((s) => !sent.has(s.id));
}

async function sendStep(step: SequenceStep, pending: Signup[]): Promise<{ sent: number; failed: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Faltan RESEND_API_KEY o EMAIL_FROM");
  const resend = new Resend(apiKey);
  const db = supabaseAdmin();
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    // Reservamos el envío primero: si dos ejecuciones se cruzan, solo una se queda con cada fila.
    const claimed = await db
      .from("waitlist_email_sends")
      .upsert(chunk.map((s) => ({ signup_id: s.id, step: step.id })), {
        onConflict: "signup_id,step",
        ignoreDuplicates: true,
      })
      .select("signup_id");
    if (claimed.error) throw new Error(`claim: ${claimed.error.code} ${claimed.error.message}`);
    const ids = new Set((claimed.data ?? []).map((r) => r.signup_id as string));
    const batch = chunk.filter((s) => ids.has(s.id));
    if (batch.length === 0) continue;

    const { error } = await resend.batch.send(
      batch.map((s) => {
        const unsubscribeUrl = `${SITE_URL}/api/waitlist/unsubscribe?token=${encodeURIComponent(unsubscribeToken(s.id))}`;
        const { subject, html, text } = renderSequenceEmail(step, unsubscribeUrl);
        return {
          from,
          to: s.email,
          subject,
          html,
          text,
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        };
      }),
    );

    if (error) {
      // Liberamos la reserva para que la siguiente ejecución lo reintente (dentro del margen).
      failed += batch.length;
      console.error("sequence: falló un lote", step.id, `${error.name}: ${error.message}`);
      const released = await db
        .from("waitlist_email_sends")
        .delete()
        .eq("step", step.id)
        .in("signup_id", batch.map((s) => s.id));
      if (released.error) console.error("sequence: no se liberó la reserva", step.id, released.error.code);
    } else {
      sent += batch.length;
    }
    // Resend permite pocas solicitudes por segundo.
    if (i + BATCH_SIZE < pending.length) await new Promise((r) => setTimeout(r, 600));
  }
  return { sent, failed };
}

async function handle(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const enabled = process.env.WAITLIST_SEQUENCE_ENABLED === "true";
  const dryRun = !enabled || url.searchParams.get("dry") === "1";
  // Para revisar qué saldría en otra fecha (solo en simulación).
  const nowParam = url.searchParams.get("now");
  const now = dryRun && nowParam && !Number.isNaN(Date.parse(nowParam)) ? Date.parse(nowParam) : Date.now();

  const due = SEQUENCE.filter((s) => now >= s.sendAtMs && now < s.sendAtMs + GRACE_MS);
  const reports: StepReport[] = [];
  try {
    for (const step of due) {
      const pending = await eligibleSignups(step);
      const result = dryRun || pending.length === 0 ? { sent: 0, failed: 0 } : await sendStep(step, pending);
      reports.push({
        step: step.id,
        name: step.name,
        sendAt: new Date(step.sendAtMs).toISOString(),
        pending: pending.length,
        ...result,
      });
    }
  } catch (err) {
    console.error("sequence: error", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, dryRun, reports }, { status: 500 });
  }

  if (reports.length) console.log("sequence:", JSON.stringify({ dryRun, reports }));
  return Response.json({ ok: true, dryRun, now: new Date(now).toISOString(), reports });
}

export const GET = handle;
export const POST = handle;
