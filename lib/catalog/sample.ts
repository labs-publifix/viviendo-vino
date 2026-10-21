import catalog from "@/data/catalogo-inicial.json";
import marca from "@/data/catalogo-marca.json";
import { pesosToCents } from "@/lib/money";
import type { BottleGroup, Category, Wine, WineType } from "./types";

// Catálogo de muestra para la página de componentes, armado de los mismos JSON que generan el seed.
// La tienda lee de Supabase (lib/catalog/repo.ts); esto solo evita que /componentes dependa de la base.

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type MarcaVino = {
  tipo: WineType;
  uva?: string | null;
  region?: string | null;
  denominacion?: string | null;
  anada?: number | null;
  premio?: string | null;
  descripcion: string;
};
const textos = marca.vinos as Record<string, MarcaVino>;

export const SAMPLE_WINES: Wine[] = catalog.vinos.map((v) => {
  const m = textos[v.nombre_oficial_excel];
  const slug = slugify(v.nombre_oficial_excel);
  return {
    id: slug,
    slug,
    name: v.nombre_oficial_excel,
    producer: v.productor,
    category: v.categoria as Category,
    group: v.grupo_color as BottleGroup,
    type: m.tipo,
    grape: m.uva ?? null,
    region: m.region ?? null,
    appellation: m.denominacion ?? null,
    vintage: m.anada ?? null,
    volumeMl: 750,
    priceCents: pesosToCents(v.precio_mxn),
    award: m.premio ?? null,
    description: m.descripcion,
    imageUrl: null,
    available: true,
  };
});
