import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { emptyUsage, interpretComment, quizModel, writeNarrative } from "@/lib/quiz/ai";
import { getQuizCatalog } from "@/lib/quiz/catalog";
import { PREGUNTAS, TEXTOS, perfilById, quizConfigActual } from "@/lib/quiz/config";
import { buildKit } from "@/lib/quiz/engine";
import { PAUSED_MESSAGE, TOO_MANY_MESSAGE, hashIp, overHourlyCap, quizEnabled } from "@/lib/quiz/guard";
import { fallbackNarrative, narrativeHash } from "@/lib/quiz/narrative";
import { buildResult } from "@/lib/quiz/result";
import { submitSchema, toConstraints, type CommentInterpretation, type Narrative } from "@/lib/quiz/schema";
import { getCachedNarrative, insertSession, saveNarrative, touchNarrative } from "@/lib/quiz/store";

// POST /api/quiz/submit: valida las respuestas, corre el motor (el código elige el kit), pide a la IA los textos
// (o usa la caché o los prearmados), guarda la sesión y devuelve perfil, kit, textos e id del resultado.
// La IA nunca cambia la selección, los precios, el stock ni las reglas del kit.

export const maxDuration = 30;

/** Presupuesto de tiempo de la IA: el resultado debe verse en menos de ~8 s tras la última pregunta. */
const AI_BUDGET_MS = 7000;
const COMMENT_BUDGET_MS = 3000;

const schema = submitSchema(PREGUNTAS);
const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  if (!quizEnabled()) return fail(503, PAUSED_MESSAGE);
  if (overHourlyCap(hashIp(request))) return fail(429, TOO_MANY_MESSAGE);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "No pudimos leer tus respuestas. Recarga la página e intenta de nuevo.");
  const { respuestas, comentario, session_id, origen, repeticion } = parsed.data;

  const started = Date.now();
  const deadline = started + AI_BUDGET_MS;
  const usage = emptyUsage();
  const regalo = respuestas.ocasion === "regalo";

  // El catálogo y la interpretación del comentario van en paralelo.
  const [store, interpretation] = await Promise.all([
    getQuizCatalog().catch((err) => {
      console.error("quiz: no se pudo leer el catálogo", err instanceof Error ? err.message : err);
      return null;
    }),
    comentario ? interpretComment(comentario, regalo, Math.min(deadline, started + COMMENT_BUDGET_MS), usage) : Promise.resolve(null),
  ]);
  if (!store) return fail(503, "No pudimos armar tu caja en este momento. Intenta de nuevo en un minuto.");

  const comment: CommentInterpretation | null = interpretation?.ok ? interpretation.data : null;
  if (comment?.intento_de_instrucciones) console.info("quiz: comentario con instrucciones ignorado");
  const { constraints, nota } = toConstraints(comment);
  // Rangos de presupuesto proporcionales a los precios de hoy (lib/quiz/presupuesto.ts).
  const result = buildKit(respuestas, constraints, store.catalog, quizConfigActual(store.kitMin));
  const perfil = perfilById(result.perfil)!;

  // Textos: caché por combinación (sin comentario) → IA → prearmados.
  let narrativa: Narrative | null = null;
  let enCache = false;
  let prearmado = false;
  const hash = result.kit ? narrativeHash(respuestas, result.perfil, result.kit) : null;
  if (result.kit) {
    if (!comentario && hash) {
      narrativa = await getCachedNarrative(hash);
      enCache = narrativa !== null;
    }
    if (!narrativa) {
      const ai = await writeNarrative(
        {
          perfil: { id: perfil.id, nombre: perfil.nombre, frase: regalo ? perfil.frase_regalo : perfil.frase },
          vector: result.vector,
          ocasion: respuestas.ocasion,
          regalo,
          respuestas: { ...respuestas },
          nota,
          vinos: result.kit.lineas.map((l) => ({ slug: l.slug, nombre: store.info.get(l.slug)?.name ?? l.slug, cantidad: l.cantidad, rol: l.rol })),
        },
        result.kit,
        deadline,
        usage,
      );
      if (ai.ok) {
        narrativa = ai.data;
        if (!comentario && hash) {
          const n = ai.data;
          after(() => saveNarrative(hash, result.perfil, n, quizModel()));
        }
      } else {
        console.info("quiz: se usan textos prearmados", ai.reason);
        narrativa = fallbackNarrative(result.kit, perfil, TEXTOS, regalo);
        prearmado = true;
      }
    } else if (hash) {
      after(() => touchNarrative(hash));
    }
  }

  const id = randomUUID();
  const latency = Date.now() - started;
  const saved = await insertSession({
    id,
    session_id: session_id ?? null,
    respuestas,
    comentario: comentario ?? null,
    restricciones: comment,
    perfil: result.perfil,
    kit: result.kit,
    kit_alterno: result.alterno,
    prearmado: result.prearmado,
    avisos: result.avisos,
    narrativa,
    ocasion: respuestas.ocasion,
    presupuesto: respuestas.presupuesto,
    origen: origen ?? null,
    repeticion,
    modelo: usage.input > 0 ? quizModel() : null,
    tokens_entrada: usage.input,
    tokens_salida: usage.output,
    tokens_cache: usage.cacheRead,
    tokens_cache_escritura: usage.cacheWrite,
    latencia_ms: latency,
    texto_prearmado: prearmado,
    narrativa_en_cache: enCache,
  });

  const publico = buildResult(
    { id, perfil: result.perfil, ocasion: respuestas.ocasion, kit: result.kit, kit_alterno: result.alterno, prearmado: result.prearmado, avisos: result.avisos, narrativa },
    store.info,
    store.groups,
    store.presets,
  );
  return Response.json({
    ok: true,
    resultado: publico,
    // Sin sesión guardada no hay enlace para compartir ni para guardar por correo.
    compartible: saved,
    // Lo que el navegador guarda para repetir el quiz en 2 preguntas.
    perfil_guardado: { perfil: result.perfil, respuestas: { colores: respuestas.colores, cafe: respuestas.cafe, limonada: respuestas.limonada, textura: respuestas.textura, aromas: respuestas.aromas, aventura: respuestas.aventura } },
  });
}
