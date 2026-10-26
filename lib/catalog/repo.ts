import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { kitSavingsCents } from "@/lib/money";
import { BOTTLE_GROUPS, CATEGORIES, type BottleGroup, type Category, type Wine } from "./types";

// Lectura pública del catálogo desde Supabase con la llave publicable (RLS: solo lo activo).
// Se cachea por minutos: un cambio de precio o stock en la base se ve sin publicar código (C-01).
// Las tablas se leen por separado y se unen aquí, pidiendo solo columnas públicas.

export type GroupInfo = {
  id: string;
  code: BottleGroup;
  name: string;
  description: string;
  fullCaseOnly: boolean;
  wineCount: number;
  kitMinCents: number;
  kitMaxCents: number;
};
export type CategoryInfo = { slug: Category; name: string; intro: string; wineCount: number; minPriceCents: number };
export type PresetKit = {
  slug: string;
  name: string;
  description: string;
  group: BottleGroup;
  items: { slug: string; name: string; quantity: number; priceCents: number; compareAtCents: number | null }[];
  totalCents: number;
  /** Ahorro por las botellas con precio antes (0 si ninguna tiene). */
  savingsCents: number;
};
export type Catalog = { wines: Wine[]; groups: GroupInfo[]; categories: CategoryInfo[]; kits: PresetKit[]; kitSize: number };

const KIT_SIZE = 6;
const PRODUCT_COLUMNS =
  "id, slug, nombre_oficial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, volumen_ml, precio_centavos, premio, descripcion, imagen_url, disponible, orden";
// Columna nueva (migración 20261030000000_precio_antes.sql). Si la base aún no la tiene, se lee sin ella y la
// tienda se ve como antes (sin precio tachado).
const PRODUCT_COLUMNS_CON_PRECIO_ANTES = `${PRODUCT_COLUMNS}, precio_antes_centavos`;

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error || !res.data) throw new Error(`Catálogo: no se pudo leer ${what}: ${res.error?.message ?? "sin datos"}`);
  return res.data;
}

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalogo");

  const db = client();
  const [productos, grupos, categorias, kits, items] = await Promise.all([
    db
      .from("productos")
      .select(PRODUCT_COLUMNS_CON_PRECIO_ANTES)
      .order("orden")
      .then((r) => (r.error?.code === "42703" ? db.from("productos").select(PRODUCT_COLUMNS).order("orden") : r)),
    db.from("grupos_botella").select("id, codigo, nombre, descripcion, solo_caja_completa, orden").order("orden"),
    db.from("categorias").select("slug, nombre, intro, orden").order("orden"),
    db.from("kits_prearmados").select("id, slug, nombre, descripcion, orden").order("orden"),
    db.from("kits_prearmados_items").select("kit_id, producto_id, cantidad"),
  ]);

  const groupRows = must(grupos, "grupos");
  const groupById = new Map(groupRows.map((g) => [g.id as string, g.codigo as BottleGroup]));

  const productRows = must(productos, "productos");
  const wines: Wine[] = productRows
    .filter((p) => groupById.has(p.grupo_id as string))
    .map((p) => ({
      id: p.id as string,
      slug: p.slug as string,
      name: p.nombre_oficial as string,
      producer: p.productor as string,
      category: p.categoria_slug as Category,
      group: groupById.get(p.grupo_id as string)!,
      type: p.tipo as Wine["type"],
      grape: (p.uva as string | null) ?? null,
      region: (p.region as string | null) ?? null,
      appellation: (p.denominacion as string | null) ?? null,
      vintage: (p.anada as number | null) ?? null,
      volumeMl: p.volumen_ml as number,
      priceCents: p.precio_centavos as number,
      compareAtCents: ((p as { precio_antes_centavos?: number | null }).precio_antes_centavos ?? null) || null,
      award: (p.premio as string | null) ?? null,
      description: p.descripcion as string,
      imageUrl: (p.imagen_url as string | null) ?? null,
      available: p.disponible as boolean,
    }));

  const groups: GroupInfo[] = groupRows
    .filter((g) => (BOTTLE_GROUPS as readonly string[]).includes(g.codigo as string))
    .map((g) => {
      const prices = wines.filter((w) => w.group === g.codigo).map((w) => w.priceCents);
      return {
        id: g.id as string,
        code: g.codigo as BottleGroup,
        name: g.nombre as string,
        description: (g.descripcion as string | null) ?? "",
        fullCaseOnly: g.solo_caja_completa as boolean,
        wineCount: prices.length,
        kitMinCents: prices.length ? Math.min(...prices) * KIT_SIZE : 0,
        kitMaxCents: prices.length ? Math.max(...prices) * KIT_SIZE : 0,
      };
    });

  const categories: CategoryInfo[] = must(categorias, "categorías")
    .filter((c) => (CATEGORIES as readonly string[]).includes(c.slug as string))
    .map((c) => {
      const prices = wines.filter((w) => w.category === c.slug).map((w) => w.priceCents);
      return {
        slug: c.slug as Category,
        name: c.nombre as string,
        intro: (c.intro as string | null) ?? "",
        wineCount: prices.length,
        minPriceCents: prices.length ? Math.min(...prices) : 0,
      };
    });

  const wineById = new Map(wines.map((w) => [w.id, w]));
  const itemRows = must(items, "kits");
  const presetKits: PresetKit[] = must(kits, "kits")
    .map((k) => {
      const lines = itemRows
        .filter((i) => i.kit_id === k.id)
        .map((i) => ({ wine: wineById.get(i.producto_id as string), quantity: i.cantidad as number }))
        .filter((l): l is { wine: Wine; quantity: number } => Boolean(l.wine));
      return {
        slug: k.slug as string,
        name: k.nombre as string,
        description: (k.descripcion as string | null) ?? "",
        group: lines[0]?.wine.group,
        items: lines.map((l) => ({ slug: l.wine.slug, name: l.wine.name, quantity: l.quantity, priceCents: l.wine.priceCents, compareAtCents: l.wine.compareAtCents ?? null })),
        totalCents: lines.reduce((s, l) => s + l.quantity * l.wine.priceCents, 0),
        savingsCents: kitSavingsCents(lines.map((l) => ({ quantity: l.quantity, priceCents: l.wine.priceCents, compareAtCents: l.wine.compareAtCents }))),
      };
    })
    // Un kit con alguna etiqueta inactiva deja de sumar 6 y no se muestra.
    .filter((k): k is PresetKit => Boolean(k.group) && k.items.reduce((s, i) => s + i.quantity, 0) === KIT_SIZE);

  return { wines, groups, categories, kits: presetKits, kitSize: KIT_SIZE };
}

export async function getWine(slug: string) {
  const catalog = await getCatalog();
  const wine = catalog.wines.find((w) => w.slug === slug) ?? null;
  return { catalog, wine };
}
