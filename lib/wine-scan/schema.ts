import { z } from "zod";

// Formato que la IA debe devolver para cada escaneo (salida estructurada de la API + validación aquí).
// Las escalas siguen wine-scan/knowledge/README.md. La temperatura viaja como mínimo y máximo por separado
// porque la salida estructurada de la API no admite tuplas; la respuesta pública la junta en [min, max].

const escala = (min: number, max: number) => z.number().int().min(min).max(max);
const texto = z.string().trim();

export const GRUPOS = ["tinto", "blanco", "rosado", "espumoso", "dulce", "fortificado", "naranja"] as const;

export const GuideSchema = z.object({
  accion: z.enum(["ok", "pedir_otra_foto", "no_es_vino"]),
  mensaje_usuario: texto.nullable(),
  identificacion: z.object({
    confianza: z.enum(["alta", "media", "baja"]),
    productor: texto.nullable(),
    nombre_vino: texto.nullable(),
    denominacion: texto.nullable(),
    anada: z.number().int().min(1800).max(2100).nullable(),
    uvas: z.array(texto).max(8),
    region: texto.nullable(),
    pais: texto.nullable(),
    alcohol_pct: z.number().min(0).max(25).nullable(),
    grupo: z.enum(GRUPOS),
    metodo_espumoso: z.enum(["tradicional", "tanque", "desconocido"]).nullable(),
    campos_leidos: z.array(texto).max(12),
  }),
  perfil_estimado: z.object({
    cuerpo: escala(1, 5),
    acidez: escala(1, 5),
    tanino: escala(0, 5),
    dulzor: escala(1, 5),
    intensidad: escala(1, 5),
  }),
  resumen_perfil: texto,
  servicio: z.object({
    estilo: texto,
    temperatura_min_c: z.number().int().min(0).max(25),
    temperatura_max_c: z.number().int().min(0).max(25),
    copa: texto,
    decantar: texto,
    texto: texto,
  }),
  maridajes: z
    .array(z.object({ principio_id: texto, tipo_de_plato: texto, porque: texto }))
    .max(3),
  cuando_tomarlo: texto,
  dato: texto,
});

export type Guide = z.infer<typeof GuideSchema>;

// Términos de etiqueta que fijan un dulzor mínimo (escala 1-5 de wine-scan/knowledge/README.md).
const DULZOR_MINIMO: [RegExp, number][] = [
  [/\b(doux|dolce|beerenauslese|trockenbeerenauslese|eiswein|ice ?wine|sauternes|tokaji|aszu|pedro xim[eé]nez|vin ?santo|passito|recioto)\b/i, 5],
  [/\b(demi[- ]?sec|semisecco|auslese|late harvest|vendimia tard[ií]a|vendange tardive|porto|oporto|port)\b/i, 4],
  [/\b(amabile|abboccato|semi ?dulce|semidolce|medium sweet|moscato d'?asti|sp[aä]tlese)\b/i, 3],
  [/\b(extra dry|kabinett|halbtrocken|off[- ]dry)\b/i, 2],
];

/** Dulzor mínimo creíble según el grupo y lo que se leyó en la etiqueta. */
export function minSweetness(g: Pick<Guide, "identificacion">): number {
  const id = g.identificacion;
  if (id.grupo === "dulce") return 5;
  const texto = [id.nombre_vino, id.denominacion].filter(Boolean).join(" ");
  for (const [re, min] of DULZOR_MINIMO) if (re.test(texto)) return min;
  // "Dry"/"Sec" a secas solo cuenta en espumosos (Extra Dry y Demi-Sec ya se revisaron arriba).
  if (id.grupo === "espumoso" && /\b(dry|sec)\b/i.test(texto)) return 3;
  return 1;
}

/**
 * Revisión que el esquema no puede hacer sola: ids que deben existir en la base de conocimiento y
 * reglas de forma de la guía. Devuelve la lista de problemas (vacía si todo está bien).
 */
export function checkGuide(g: Guide, ids: { estilos: Set<string>; principios: Set<string> }): string[] {
  if (g.accion !== "ok") return g.mensaje_usuario ? [] : ["falta mensaje_usuario"];
  const problemas: string[] = [];
  if (!ids.estilos.has(g.servicio.estilo)) problemas.push(`estilo de servicio desconocido: ${g.servicio.estilo}`);
  if (g.servicio.temperatura_min_c > g.servicio.temperatura_max_c) problemas.push("temperatura mínima mayor que la máxima");
  if (g.maridajes.length < 2) problemas.push("menos de 2 maridajes");
  for (const m of g.maridajes) if (!ids.principios.has(m.principio_id)) problemas.push(`principio desconocido: ${m.principio_id}`);
  if (!g.resumen_perfil || !g.dato || !g.cuando_tomarlo) problemas.push("faltan textos");
  // Dulzor coherente con el estilo: la uva casi nunca lo indica, así que la IA tiende a dejarlo en 0.
  const minimo = minSweetness(g);
  if (g.perfil_estimado.dulzor < minimo) {
    problemas.push(`dulzor ${g.perfil_estimado.dulzor} es muy bajo para este vino (mínimo ${minimo} por su estilo o los términos de la etiqueta)`);
  }
  // Con la añada conocida, la guía decide por la persona: nada de "si es joven…" copiado de la base.
  const condicional = /\bsi (el vino )?(es|está|tiene)\s+(muy\s+)?(joven|viejo|añejo|maduro|pocos años|muchos años)|seg[uú]n (la|su) añada/i;
  if (g.identificacion.anada !== null) {
    for (const [campo, texto] of [["servicio.decantar", g.servicio.decantar], ["servicio.texto", g.servicio.texto], ["cuando_tomarlo", g.cuando_tomarlo]] as const) {
      if (condicional.test(texto)) problemas.push(`${campo} usa una condición ("si es joven…") aunque la añada es ${g.identificacion.anada}: decide con la edad de la cosecha`);
    }
  }
  return problemas;
}
