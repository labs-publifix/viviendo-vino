// Textos del resultado sin IA (prearmados de quiz/config/textos.json) y llave de la caché de narrativas.
// Lógica pura, para usarla igual en el servidor y en las pruebas.

import { createHash } from "node:crypto";
import type { Answers, Kit } from "./engine.ts";
import { PROMPT_VERSION } from "./prompt.ts";
import type { Narrative } from "./schema.ts";

export type Textos = {
  invitacion_reto: string;
  vinos: Record<string, { motivo: string; reto: string }>;
};
export type PerfilTexto = { frase: string; frase_regalo: string };

/** El resultado completo con textos prearmados: el quiz nunca se queda sin texto. */
export function fallbackNarrative(kit: Pick<Kit, "lineas">, perfil: PerfilTexto, textos: Textos, regalo: boolean): Narrative {
  const hayReto = kit.lineas.some((l) => l.rol === "reto");
  return {
    frase_perfil: regalo ? perfil.frase_regalo : perfil.frase,
    vinos: kit.lineas.map((l) => ({
      slug: l.slug,
      motivo: (l.rol === "reto" ? textos.vinos[l.slug]?.reto : textos.vinos[l.slug]?.motivo) ?? "",
    })),
    invitacion_reto: hayReto ? textos.invitacion_reto : null,
    nota_ocasion: null,
  };
}

/**
 * Llave de la caché de narrativas: versión del prompt + respuestas + perfil + kit. Las respuestas llegan ya
 * normalizadas (listas ordenadas) y el JSON se arma con las llaves en orden fijo.
 */
export function narrativeHash(answers: Answers, perfil: string, kit: Pick<Kit, "lineas">): string {
  const a = answers;
  const payload = JSON.stringify([
    PROMPT_VERSION,
    perfil,
    [a.ocasion, [...a.colores].sort(), a.cafe, a.limonada, a.textura, [...a.aromas].sort(), a.aventura, a.presupuesto],
    kit.lineas.map((l) => [l.slug, l.cantidad, l.rol]),
  ]);
  return createHash("sha256").update(payload).digest("hex");
}
