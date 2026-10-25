// Junta las tres fuentes del catálogo del quiz: el perfil de sabor (catalog-profiles.json o la tabla
// wine_profiles), los datos del quiz (quiz/config/vinos.json) y el producto real de Supabase (precio, grupo,
// stock). Un perfil sin producto en Supabase no entra al catálogo del quiz y se reporta. Lógica pura.

import type { Ejes, Familia, QuizCatalog, QuizWine } from "./engine.ts";

export type ProfileRow = { slug: string; nombre: string; grupo: string; perfil: Ejes; lista?: number };
export type ExtraRow = { familias_aromaticas: string[]; ocasiones: string[]; platos: string[]; rol_kit: QuizWine["rol"] };
export type ProductRow = { slug: string; name: string; group: string; priceCents: number; available: boolean };
export type PresetRow = { slug: string; items: { slug: string; quantity: number }[] };

export function familyOf(grupoVino: string): Familia | null {
  if (grupoVino === "blanco" || grupoVino === "rosado") return "blanco";
  if (grupoVino === "tinto" || grupoVino === "espumoso") return grupoVino;
  return null;
}

export function mergeCatalog(
  profiles: ProfileRow[],
  extras: Record<string, ExtraRow>,
  products: ProductRow[],
  presets: PresetRow[],
): { catalog: QuizCatalog; missing: string[] } {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const missing: string[] = [];
  const wines: QuizWine[] = [];
  for (const p of [...profiles].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const product = bySlug.get(p.slug);
    const extra = extras[p.slug];
    const familia = familyOf(p.grupo);
    if (!product || !extra || !familia) {
      missing.push(p.slug);
      continue;
    }
    wines.push({
      slug: p.slug,
      // El premio no se menciona hasta confirmar concurso y año (igual que en Wine Scan).
      nombre: product.name.replace(/\s*\(Double Gold\)/i, ""),
      grupo: product.group,
      familia,
      perfil: p.perfil,
      aromas: extra.familias_aromaticas,
      ocasiones: extra.ocasiones,
      platos: extra.platos,
      rol: extra.rol_kit,
      priceCents: product.priceCents,
      available: product.available,
    });
  }
  return { catalog: { wines, presets }, missing };
}
