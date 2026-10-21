import catalog from "@/data/catalogo-inicial.json";
import { pesosToCents } from "@/lib/money";
import type { BottleGroup, Category, Wine } from "./types";

// Catálogo de muestra para la página de componentes, con precios reales del JSON.
// En el paso 3 lo reemplaza la lectura desde Supabase.

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const SAMPLE_WINES: Wine[] = catalog.vinos.map((v) => ({
  slug: slugify(v.nombre_oficial_excel),
  name: v.nombre_oficial_excel,
  producer: v.productor,
  category: v.categoria as Category,
  group: v.grupo_color as BottleGroup,
  priceCents: pesosToCents(v.precio_mxn),
  description: v.descripcion_aliado_texto_fuente,
  imageUrl: null,
  available: true,
}));
