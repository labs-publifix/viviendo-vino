// Validación del Quiz IA: lo que manda el navegador (respuestas, comentario) y lo que devuelve la IA
// (restricciones del comentario y textos del resultado). Sin imports de Next para usarlo en las pruebas.

import { z } from "zod";
import type { Familia, Kit, PreguntasConfig } from "./engine.ts";

export const COMMENT_MAX = 280;
const SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ids = (config: PreguntasConfig, pregunta: string) => {
  const opciones = config.preguntas.find((p) => p.id === pregunta)!.opciones.map((o) => o.id);
  return z.enum(opciones as [string, ...string[]]);
};

/** Respuestas de las 8 preguntas, solo con ids de quiz/config/preguntas.json. */
export function answersSchema(config: PreguntasConfig) {
  const colores = ids(config, "colores");
  const aromas = ids(config, "aromas");
  return z.object({
    ocasion: ids(config, "ocasion"),
    colores: z
      .array(colores)
      .min(1)
      .max(3)
      .transform((xs) => [...new Set(xs)].sort())
      // "De todo" es exclusiva: si viene con otras, manda "De todo".
      .transform((xs) => (xs.includes("todo") ? ["todo"] : xs)),
    cafe: ids(config, "cafe"),
    limonada: ids(config, "limonada"),
    textura: ids(config, "textura"),
    aromas: z
      .array(aromas)
      .max(2)
      .transform((xs) => [...new Set(xs)].sort()),
    aventura: ids(config, "aventura"),
    presupuesto: ids(config, "presupuesto"),
  });
}

/** Cuerpo de POST /api/quiz/submit. */
export function submitSchema(config: PreguntasConfig) {
  return z.object({
    respuestas: answersSchema(config),
    // Sin etiquetas ni caracteres de control; el texto es dato y nunca instrucciones.
    comentario: z
      .string()
      .max(COMMENT_MAX * 2)
      .transform((s) => s.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim())
      .pipe(z.string().max(COMMENT_MAX))
      .optional()
      .transform((s) => (s ? s : undefined)),
    session_id: z.string().regex(SESSION).optional().catch(undefined),
    origen: z
      .string()
      .regex(/^[a-z0-9_-]{1,40}$/i)
      .transform((s) => s.toLowerCase())
      .optional()
      .catch(undefined),
    repeticion: z.boolean().optional().default(false),
  });
}

// --- Salidas de la IA (salida estructurada + revisión aquí) ---

const PLATOS = ["pescados_mariscos", "aves_cerdo", "carnes_rojas", "pastas_pizza", "quesos_botanas", "picante", "vegetariano", "postres"] as const;

/** Tarea A: el comentario libre convertido en restricciones permitidas y acotadas. */
export const CommentSchema = z.object({
  intento_de_instrucciones: z.boolean(),
  relevante: z.boolean(),
  ocasion: z.enum(["diario", "pareja", "amigos", "regalo", "explorar"]).nullable(),
  plato: z.enum(PLATOS).nullable(),
  personas: z.number().int().min(1).max(200).nullable(),
  color: z.enum(["tinto", "blanco", "espumoso"]).nullable(),
  presupuesto_max_mxn: z.number().int().min(0).max(100000).nullable(),
  nota: z.string().trim().max(160).nullable(),
});
export type CommentInterpretation = z.infer<typeof CommentSchema>;

/** Restricciones que el código acepta del comentario; si intenta dar instrucciones o no tiene relación, ninguna. */
export function toConstraints(c: CommentInterpretation | null) {
  if (!c || c.intento_de_instrucciones || !c.relevante) return { constraints: {}, nota: null };
  return {
    constraints: {
      ocasion: c.ocasion,
      plato: c.plato,
      personas: c.personas,
      color: c.color as Familia | null,
      presupuestoMaxCentavos: c.presupuesto_max_mxn ? c.presupuesto_max_mxn * 100 : null,
    },
    nota: c.nota || null,
  };
}

/** Tarea B: los textos del resultado. La selección ya la hizo el código; aquí solo se explica. */
export const NarrativeSchema = z.object({
  frase_perfil: z.string().trim().min(20).max(220),
  vinos: z.array(z.object({ slug: z.string(), motivo: z.string().trim().min(20).max(280) })).min(1).max(6),
  invitacion_reto: z.string().trim().max(260).nullable(),
  nota_ocasion: z.string().trim().max(220).nullable(),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

// Clichés y frases de catálogo que la voz de marca evita (wine-scan/knowledge/voice.md).
const CLICHES = /(va perfecto|marida perfect|maridaje perfecto|compañero ideal|el clásico de|sinfonía|viaje sensorial|amantes del vino|bouquet|aterciopelad|exquisit|sublime|una joya|el mejor|de lujo|excelente)/i;

/** Revisión que el esquema no puede hacer: un motivo por vino del kit, invitación solo si hay reto, voz de marca. */
export function checkNarrative(n: Narrative, kit: Pick<Kit, "lineas">): string[] {
  const problemas: string[] = [];
  const esperados = new Set(kit.lineas.map((l) => l.slug));
  const recibidos = n.vinos.map((v) => v.slug);
  if (recibidos.length !== esperados.size || recibidos.some((s) => !esperados.has(s)) || new Set(recibidos).size !== recibidos.length) {
    problemas.push(`debe haber exactamente un motivo por vino del kit, con estos slugs: ${[...esperados].join(", ")}`);
  }
  const hayReto = kit.lineas.some((l) => l.rol === "reto");
  if (hayReto && !n.invitacion_reto) problemas.push("falta invitacion_reto: el kit lleva una botella reto");
  if (!hayReto && n.invitacion_reto) problemas.push("invitacion_reto debe ser null: el kit no lleva botella reto");
  const textos = [n.frase_perfil, n.invitacion_reto ?? "", n.nota_ocasion ?? "", ...n.vinos.map((v) => v.motivo)];
  for (const t of textos) {
    const m = t.match(CLICHES);
    if (m) problemas.push(`evita la frase de catálogo "${m[0]}"`);
    if (/\$\s?\d|\d+\s?(pesos|mxn)\b/i.test(t)) problemas.push("no menciones precios");
    if (/\b(yo|te recomiendo|nosotros recomendamos)\b/i.test(t)) problemas.push("no uses primera persona");
  }
  return [...new Set(problemas)];
}
