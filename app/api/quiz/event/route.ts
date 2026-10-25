import { after } from "next/server";
import { z } from "zod";
import { hashIp, overEventCap } from "@/lib/quiz/guard";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/quiz/event: eventos de la interfaz para medir el embudo (inicio, pregunta vista, compartido,
// agregado al carrito…). Sin datos personales. Responde siempre rápido; la escritura va después de responder.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPOS = ["inicio", "pregunta", "comentario", "resultado", "compartido", "copiado", "tarjeta", "carrito", "prearmado", "segundo_kit", "guardar", "repetir", "repetir_perfil", "visita_compartida"] as const;
const CUENTA_COMO_COMPARTIDO = new Set(["compartido", "copiado", "tarjeta"]);

const schema = z.object({
  tipo: z.enum(TIPOS),
  session_id: z.string().regex(UUID).optional().catch(undefined),
  quiz_id: z.string().regex(UUID).optional().catch(undefined),
  pregunta: z.number().int().min(1).max(9).optional().catch(undefined),
  origen: z.string().regex(/^[a-z0-9_-]{1,40}$/i).optional().catch(undefined),
});

export async function POST(request: Request) {
  if (overEventCap(hashIp(request))) return new Response(null, { status: 204 });
  // sendBeacon manda text/plain: se lee el texto y se interpreta como JSON.
  const parsed = schema.safeParse(await request.text().then((t) => JSON.parse(t)).catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const e = parsed.data;
  after(async () => {
    try {
      const db = supabaseAdmin();
      const { error } = await db.from("quiz_events").insert({
        tipo: e.tipo,
        session_id: e.session_id ?? null,
        quiz_id: e.quiz_id ?? null,
        pregunta: e.pregunta ?? null,
        origen: e.origen?.toLowerCase() ?? null,
      });
      if (error) console.error("quiz: no se guardó el evento", error.code);
      if (!e.quiz_id) return;
      if (e.tipo === "carrito") {
        // Solo la primera vez: guarda cuándo pasó del resultado al armador.
        const { error: err } = await db.from("quiz_sessions").update({ agrego_carrito: true, agrego_carrito_at: new Date().toISOString() }).eq("id", e.quiz_id).is("agrego_carrito_at", null);
        if (err) console.error("quiz: no se marcó agregar al carrito", err.code);
      } else if (CUENTA_COMO_COMPARTIDO.has(e.tipo)) {
        const { data } = await db.from("quiz_sessions").select("compartido").eq("id", e.quiz_id).maybeSingle();
        if (data) await db.from("quiz_sessions").update({ compartido: Math.min(30000, (data.compartido ?? 0) + 1) }).eq("id", e.quiz_id);
      }
    } catch (err) {
      console.error("quiz: no se guardó el evento", err instanceof Error ? err.message : err);
    }
  });
  return new Response(null, { status: 204 });
}
