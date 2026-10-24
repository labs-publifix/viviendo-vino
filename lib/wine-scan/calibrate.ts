// Calibración del perfil estimado por la IA contra datos objetivos: el perfil típico de las uvas
// (wine-scan/knowledge/grapes.json) y el alcohol leído en la etiqueta. La IA tiende a inflar las escalas;
// aquí cada eje queda cerca del rango típico de sus uvas. Lógica pura, sin imports.

export type Ejes = { cuerpo: number; acidez: number; tanino: number; dulzor: number; intensidad: number };
export type UvaBase = { id: string; color: string; cuerpo: number; acidez: number; tanino: number; intensidad: number };
export type Ajuste = { eje: keyof Ejes; de: number; a: number; motivo: string };

const EJES_UVA = ["cuerpo", "acidez", "tanino", "intensidad"] as const;
/** Holgura sobre el rango de la uva: el cuerpo cambia mucho con la barrica, el clima y el alcohol; lo demás, poco. */
const HOLGURA = { cuerpo: 2, acidez: 1, tanino: 1, intensidad: 1 } as const;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function calibrateProfile(
  perfil: Ejes,
  contexto: { grupo: string; uvas: string[]; alcohol: number | null },
  uvas: Map<string, UvaBase>,
): { perfil: Ejes; ajustes: Ajuste[] } {
  const out = { ...perfil };
  const ajustes: Ajuste[] = [];
  const set = (eje: keyof Ejes, valor: number, motivo: string) => {
    if (valor !== out[eje]) ajustes.push({ eje, de: out[eje], a: valor, motivo });
    out[eje] = valor;
  };

  // 1) Rango típico de las uvas identificadas (en mezclas, del mínimo al máximo de todas), con holgura para región,
  //    añada y estilo (HOLGURA). Si alguna uva no está en la base, no se limita (no hay referencia).
  const conocidas = contexto.uvas.map((u) => uvas.get(u));
  if (conocidas.length > 0 && conocidas.every((u) => u !== undefined)) {
    for (const eje of EJES_UVA) {
      if (eje === "tanino" && contexto.grupo !== "tinto") continue;
      const valores = conocidas.map((u) => u![eje]);
      const min = Math.max(eje === "tanino" ? 0 : 1, Math.min(...valores) - HOLGURA[eje]);
      const max = Math.min(5, Math.max(...valores) + HOLGURA[eje]);
      set(eje, clamp(out[eje], min, max), `rango típico de ${contexto.uvas.join(", ")}`);
    }
  }

  // 2) Sin tanino en blancos, rosados y espumosos (escala de la base).
  if (["blanco", "rosado", "espumoso"].includes(contexto.grupo)) set("tanino", 0, "sin tanino en este grupo");

  // 3) El alcohol de la etiqueta es un dato: en vinos secos, poco alcohol no da cuerpo pleno y mucho no da cuerpo ligero.
  const a = contexto.alcohol;
  if (a !== null && out.dulzor <= 1 && ["tinto", "blanco", "rosado"].includes(contexto.grupo)) {
    if (a <= 12) set("cuerpo", Math.min(out.cuerpo, 3), `alcohol ${a}%`);
    else if (a < 13) set("cuerpo", Math.min(out.cuerpo, 4), `alcohol ${a}%`);
    else if (a >= 14.5) set("cuerpo", Math.max(out.cuerpo, 3), `alcohol ${a}%`);
  }

  return { perfil: out, ajustes };
}
