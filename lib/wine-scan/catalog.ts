import "server-only";
import { getCatalog } from "@/lib/catalog/repo";
import { CATALOG_PROFILES } from "./knowledge";
import type { Candidato } from "./recommend";

// Vinos que Wine Scan puede sugerir: los perfiles de catalog-profiles.json que existen en Supabase y están
// disponibles. Precio, imagen y nombre salen siempre de Supabase, nunca del JSON.

export type CatalogWine = { slug: string; name: string; priceCents: number; imageUrl: string | null };

let warned = false;

export async function getCandidates(): Promise<{ candidates: Candidato[]; wines: Map<string, CatalogWine> }> {
  const { wines } = await getCatalog();
  const bySlug = new Map(wines.map((w) => [w.slug, w]));

  const missing = CATALOG_PROFILES.filter((p) => !bySlug.has(p.slug)).map((p) => p.slug);
  if (missing.length > 0 && !warned) {
    warned = true;
    console.warn("wine-scan: perfiles sin producto en Supabase (no se recomiendan):", missing.join(", "));
  }

  const candidates: Candidato[] = [];
  const info = new Map<string, CatalogWine>();
  for (const p of CATALOG_PROFILES) {
    const w = bySlug.get(p.slug);
    if (!w || !w.available) continue;
    candidates.push({ ...p, precioCentavos: w.priceCents });
    // El premio no se menciona en Wine Scan hasta confirmar concurso y año (catalog-profiles.json).
    info.set(p.slug, { slug: w.slug, name: w.name.replace(/\s*\(Double Gold\)/i, ""), priceCents: w.priceCents, imageUrl: w.imageUrl });
  }
  return { candidates, wines: info };
}
