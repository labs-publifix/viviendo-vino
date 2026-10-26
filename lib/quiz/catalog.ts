import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getCatalog } from "@/lib/catalog/repo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import catalogProfiles from "@/wine-scan/knowledge/catalog-profiles.json";
import vinosQuiz from "@/quiz/config/vinos.json";
import type { QuizCatalog } from "./engine";
import { mergeCatalog, type ExtraRow, type ProfileRow } from "./merge";

// Catálogo del quiz: perfiles de la tabla wine_profiles (alimentada desde catalog-profiles.json) unidos con los
// productos de Supabase (precio, grupo del armador, stock, foto). Si la tabla todavía no existe o está vacía,
// usa los mismos archivos del repo que la alimentan. Un vino sin producto o sin stock nunca se recomienda.

type ProfileJson = { slug: string; nombre: string; grupo: string; lista: number; perfil: ProfileRow["perfil"] };

const JSON_PROFILES: ProfileRow[] = (catalogProfiles.vinos as ProfileJson[]).map((p) => ({ slug: p.slug, nombre: p.nombre, grupo: p.grupo, lista: p.lista, perfil: p.perfil }));
const JSON_EXTRAS = vinosQuiz.vinos as Record<string, ExtraRow>;

async function profilesFromDb(): Promise<{ profiles: ProfileRow[]; extras: Record<string, ExtraRow> } | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("wine_profiles");
  try {
    const { data, error } = await supabaseAdmin()
      .from("wine_profiles")
      .select("slug, nombre, lista, grupo, cuerpo, acidez, tanino, dulzor, intensidad, familias_aromaticas, ocasiones, platos, rol_kit, activo");
    if (error || !data || data.length === 0) {
      console.warn("quiz: wine_profiles no disponible, se usan los archivos del repo", error?.code ?? "vacía");
      return null;
    }
    const activos = data.filter((r) => r.activo);
    return {
      profiles: activos.map((r) => ({
        slug: r.slug,
        nombre: r.nombre,
        grupo: r.grupo,
        lista: r.lista,
        perfil: { cuerpo: r.cuerpo, acidez: r.acidez, tanino: r.tanino, dulzor: r.dulzor, intensidad: r.intensidad },
      })),
      extras: Object.fromEntries(activos.map((r) => [r.slug, { familias_aromaticas: r.familias_aromaticas, ocasiones: r.ocasiones, platos: r.platos, rol_kit: r.rol_kit }])),
    };
  } catch (err) {
    console.warn("quiz: wine_profiles no disponible, se usan los archivos del repo", err instanceof Error ? err.message : err);
    return null;
  }
}

export type WineInfo = { slug: string; name: string; priceCents: number; compareAtCents?: number | null; imageUrl: string | null; available: boolean; group: string };
export type GroupName = { code: string; name: string };

let warned = "";

export async function getQuizCatalog(): Promise<{ catalog: QuizCatalog; info: Map<string, WineInfo>; groups: GroupName[]; presets: { slug: string; name: string; description: string; totalCents: number; savingsCents?: number }[] }> {
  const [store, db] = await Promise.all([getCatalog(), profilesFromDb()]);
  const source = db ?? { profiles: JSON_PROFILES, extras: JSON_EXTRAS };
  const { catalog, missing } = mergeCatalog(
    source.profiles,
    source.extras,
    store.wines.map((w) => ({ slug: w.slug, name: w.name, group: w.group, priceCents: w.priceCents, available: w.available })),
    store.kits.map((k) => ({ slug: k.slug, items: k.items.map((i) => ({ slug: i.slug, quantity: i.quantity })) })),
  );
  const key = missing.join(",");
  if (missing.length > 0 && warned !== key) {
    warned = key;
    console.warn("quiz: perfiles sin producto en Supabase (no se recomiendan):", key);
  }
  const unavailable = catalog.wines.filter((w) => !w.available).map((w) => w.slug);
  if (unavailable.length > 0) console.info("quiz: vinos sin stock (no se recomiendan):", unavailable.join(", "));
  return {
    catalog,
    info: new Map(store.wines.map((w) => [w.slug, { slug: w.slug, name: w.name.replace(/\s*\(Double Gold\)/i, ""), priceCents: w.priceCents, compareAtCents: w.compareAtCents ?? null, imageUrl: w.imageUrl, available: w.available, group: w.group }])),
    groups: store.groups.map((g) => ({ code: g.code, name: g.name })),
    presets: store.kits.map((k) => ({ slug: k.slug, name: k.name, description: k.description, totalCents: k.totalCents, savingsCents: k.savingsCents })),
  };
}

/** Fichas de los vinos para el prompt (siempre del repo: son texto estable para la caché de prompts). */
export const WINE_FACTS = (catalogProfiles.vinos as (ProfileJson & { uvas: string[]; region: string; argumento: string })[]).map((p) => ({
  slug: p.slug,
  nombre: p.nombre,
  uvas: p.uvas,
  region: p.region,
  argumento: p.argumento,
  perfil: p.perfil,
  aromas: JSON_EXTRAS[p.slug]?.familias_aromaticas ?? [],
  platos: JSON_EXTRAS[p.slug]?.platos ?? [],
  rol: JSON_EXTRAS[p.slug]?.rol_kit ?? "basico",
}));
