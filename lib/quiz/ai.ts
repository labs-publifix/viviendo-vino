import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import vinosQuiz from "@/quiz/config/vinos.json";
import { WINE_FACTS } from "./catalog";
import { PERFILES } from "./config";
import type { Kit } from "./engine";
import { buildSystemPrompt, commentMessage, narrativeMessage, type NarrativeInput } from "./prompt";
import { CommentSchema, NarrativeSchema, checkNarrative, type CommentInterpretation, type Narrative } from "./schema";

// Las dos llamadas a Claude del quiz: interpretar el comentario libre (solo si lo hay) y redactar el resultado.
// La IA nunca elige vinos: recibe la caja que ya armó el código. La clave (ANTHROPIC_API_KEY) solo existe en el
// servidor y nunca se registra. Tiempo total acotado para mostrar el resultado en menos de ~8 segundos.

export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const quizModel = () => process.env.QUIZ_MODEL?.trim() || DEFAULT_MODEL;

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };
export const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
type Fail = "timeout" | "overloaded" | "refusal" | "invalid" | "config" | "error";
export type AiResult<T> = { ok: true; data: T } | { ok: false; reason: Fail };

// next.config.ts incluye wine-scan/knowledge/voice.md en el despliegue de /api/quiz/submit.
const VOICE = readFileSync(join(process.cwd(), "wine-scan/knowledge/voice.md"), "utf8");
export const SYSTEM_PROMPT = buildSystemPrompt({
  voice: VOICE,
  perfiles: PERFILES.map((p) => ({ id: p.id, nombre: p.nombre, frase: p.frase, descripcion: p.descripcion })),
  vinos: WINE_FACTS,
  familiasAromaticas: vinosQuiz.familias_aromaticas,
  platos: vinosQuiz.platos,
});

const COMMENT_FORMAT = (() => {
  const { type, schema } = zodOutputFormat(CommentSchema);
  return { type, schema };
})();
const NARRATIVE_FORMAT = (() => {
  const { type, schema } = zodOutputFormat(NarrativeSchema);
  return { type, schema };
})();

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  // Sin reintentos automáticos: el presupuesto de tiempo lo administra este módulo.
  client ??= new Anthropic({ maxRetries: 0 });
  return client;
}

function addUsage(usage: Usage, u: Anthropic.Usage) {
  usage.input += u.input_tokens;
  usage.output += u.output_tokens;
  usage.cacheRead += u.cache_read_input_tokens ?? 0;
  usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
}

/**
 * Una llamada con salida estructurada. Valida con zod y con `check`; si falla el formato y queda tiempo,
 * reintenta una sola vez con la nota del problema. `deadline` es el momento (ms) en que hay que rendirse.
 */
async function call<T>(opts: {
  task: "comentario" | "narrativa";
  message: (retryNote: string | null) => string;
  format: { type: "json_schema"; schema: Record<string, unknown> };
  parse: (raw: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
  check?: (data: T) => string[];
  maxTokens: number;
  deadline: number;
  usage: Usage;
}): Promise<AiResult<T>> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, reason: "config" };
  const model = quizModel();
  let retryNote: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = opts.deadline - Date.now();
    if (remaining < 1500) return { ok: false, reason: "timeout" };
    let message: Anthropic.Message;
    try {
      message = await anthropic().messages.create(
        {
          model,
          max_tokens: opts.maxTokens,
          // Prompt de sistema estable y en caché (1 h): las dos tareas comparten el mismo prefijo.
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral", ttl: "1h" } }],
          messages: [{ role: "user", content: opts.message(retryNote) }],
          // Esfuerzo bajo: son textos cortos y la meta es responder en segundos.
          output_config: { effort: "low", format: opts.format },
        },
        { timeout: remaining },
      );
    } catch (err) {
      if (err instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, reason: "timeout" };
      if (err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && (err.status === 529 || err.status === 503))) {
        return { ok: false, reason: "overloaded" };
      }
      // Sin el contenido de la petición: solo el tipo y el estado.
      console.error(`quiz: error de la API (${opts.task})`, err instanceof Anthropic.APIError ? err.status : "", err instanceof Error ? err.name : "");
      return { ok: false, reason: "error" };
    }
    addUsage(opts.usage, message.usage);
    console.info(`quiz: tokens (${opts.task})`, {
      model,
      attempt,
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      cacheRead: message.usage.cache_read_input_tokens ?? 0,
      cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
    });
    if (message.stop_reason === "refusal") return { ok: false, reason: "refusal" };

    const text = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      retryNote = message.stop_reason === "max_tokens" ? "la respuesta quedó incompleta; sé más breve" : "la respuesta no fue JSON válido";
      continue;
    }
    const parsed = opts.parse(raw);
    if (!parsed.success) {
      retryNote = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      continue;
    }
    const problems = opts.check?.(parsed.data) ?? [];
    if (problems.length > 0) {
      retryNote = problems.join("; ");
      continue;
    }
    return { ok: true, data: parsed.data };
  }
  console.error(`quiz: la respuesta (${opts.task}) no pasó la validación después del reintento`);
  return { ok: false, reason: "invalid" };
}

/** Tarea A: comentario libre → restricciones acotadas. Si falla, el quiz sigue sin restricciones. */
export function interpretComment(comentario: string, regalo: boolean, deadline: number, usage: Usage) {
  return call<CommentInterpretation>({
    task: "comentario",
    message: (note) => commentMessage(comentario, regalo) + (note ? `\n\nLa respuesta anterior no cumplió las reglas: ${note}. Corrígelo.` : ""),
    format: COMMENT_FORMAT,
    parse: (raw) => CommentSchema.safeParse(raw),
    maxTokens: 800,
    deadline,
    usage,
  });
}

/** Tarea B: textos del resultado para la caja que ya armó el código. */
export function writeNarrative(input: NarrativeInput, kit: Pick<Kit, "lineas">, deadline: number, usage: Usage) {
  return call<Narrative>({
    task: "narrativa",
    message: (note) => narrativeMessage(input, note),
    format: NARRATIVE_FORMAT,
    parse: (raw) => NarrativeSchema.safeParse(raw),
    check: (n) => checkNarrative(n, kit),
    maxTokens: 2500,
    deadline,
    usage,
  });
}
