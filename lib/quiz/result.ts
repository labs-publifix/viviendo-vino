// Resultado público del quiz: lo que ve el navegador (y el enlace compartible). Se arma en el servidor con lo que
// decidió el motor, los textos (IA o prearmados) y los datos actuales de la tienda (nombre, precio, foto, stock).
// No incluye el comentario libre ni datos internos.

import { formatMXN } from "@/lib/money";
import { TEXTOS, perfilById } from "./config";
import type { Aviso, Familia, Kit, Rol } from "./engine";
import type { Narrative } from "./schema";

export type WineRef = { slug: string; name: string; priceCents: number; imageUrl: string | null; available: boolean };

export type ResultLine = {
  slug: string;
  nombre: string;
  cantidad: number;
  rol: Rol;
  precioCentavos: number;
  imagen: string | null;
  disponible: boolean;
  motivo: string;
};
export type ResultKit = {
  grupo: string;
  grupoNombre: string;
  familia: Familia;
  totalCentavos: number;
  lineas: ResultLine[];
  armadorUrl: string;
  disponible: boolean;
};
export type QuizResult = {
  id: string;
  perfil: { id: string; nombre: string; frase: string; fraseCorta: string };
  regalo: boolean;
  kit: ResultKit | null;
  invitacionReto: string | null;
  notaOcasion: string | null;
  alterno: ResultKit | null;
  prearmado: { slug: string; nombre: string; descripcion: string; totalCentavos: number } | null;
  avisos: string[];
};

export type StoredSession = {
  id: string;
  perfil: string;
  ocasion: string;
  kit: Kit | null;
  kit_alterno: Kit | null;
  prearmado: string | null;
  avisos: Aviso[];
  narrativa: Narrative | null;
};

export function armadorUrl(kit: Pick<Kit, "lineas">, quizId: string): string {
  const vinos = kit.lineas.map((l) => `${l.slug}:${l.cantidad}`).join(",");
  return `/arma-tu-kit?vinos=${encodeURIComponent(vinos)}&quiz=${quizId}`;
}

function avisoTexto(a: Aviso): string {
  const t = TEXTOS.avisos;
  switch (a.tipo) {
    case "presupuesto":
      return t.presupuesto.replace("{familia}", TEXTOS.familias[a.familia]).replace("{minimo}", formatMXN(a.minimoCentavos)).replace("{alternativa}", TEXTOS.familias[a.alternativa]);
    case "presupuesto_sin_alternativa":
      return t.presupuesto_sin_alternativa.replace("{minimo}", formatMXN(a.minimoCentavos));
    default:
      return t[a.tipo];
  }
}

export function buildResult(
  s: StoredSession,
  wines: Map<string, WineRef>,
  groups: { code: string; name: string }[],
  presets: { slug: string; name: string; description: string; totalCents: number }[],
): QuizResult {
  const perfil = perfilById(s.perfil) ?? perfilById("suave-redondo")!;
  const regalo = s.ocasion === "regalo";
  const motivos = new Map((s.narrativa?.vinos ?? []).map((v) => [v.slug, v.motivo]));

  const toKit = (k: Kit | null, conMotivos: boolean): ResultKit | null => {
    if (!k) return null;
    const lineas = k.lineas.map((l) => {
      const w = wines.get(l.slug);
      const prearmado = l.rol === "reto" ? TEXTOS.vinos[l.slug]?.reto : TEXTOS.vinos[l.slug]?.motivo;
      return {
        slug: l.slug,
        nombre: w?.name ?? l.slug,
        cantidad: l.cantidad,
        rol: l.rol,
        precioCentavos: w?.priceCents ?? 0,
        imagen: w?.imageUrl ?? null,
        disponible: Boolean(w?.available),
        motivo: (conMotivos ? motivos.get(l.slug) : undefined) ?? prearmado ?? "",
      };
    });
    return {
      grupo: k.grupo,
      grupoNombre: groups.find((g) => g.code === k.grupo)?.name ?? "",
      familia: k.familia,
      // Precio actual de la tienda (el del momento del quiz puede haber cambiado).
      totalCentavos: lineas.reduce((sum, l) => sum + l.cantidad * l.precioCentavos, 0),
      lineas,
      armadorUrl: armadorUrl(k, s.id),
      disponible: lineas.every((l) => l.disponible),
    };
  };

  const preset = s.prearmado ? presets.find((p) => p.slug === s.prearmado) : undefined;
  return {
    id: s.id,
    perfil: { id: perfil.id, nombre: perfil.nombre, frase: s.narrativa?.frase_perfil ?? (regalo ? perfil.frase_regalo : perfil.frase), fraseCorta: perfil.frase },
    regalo,
    kit: toKit(s.kit, true),
    invitacionReto: s.kit?.lineas.some((l) => l.rol === "reto") ? (s.narrativa?.invitacion_reto ?? TEXTOS.invitacion_reto) : null,
    notaOcasion: s.narrativa?.nota_ocasion ?? null,
    alterno: toKit(s.kit_alterno, false),
    prearmado: preset ? { slug: preset.slug, nombre: preset.name, descripcion: preset.description, totalCentavos: preset.totalCents } : null,
    avisos: s.avisos.map(avisoTexto),
  };
}
