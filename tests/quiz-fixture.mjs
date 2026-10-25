// Catálogo real para las pruebas del quiz: perfiles de catalog-profiles.json, datos de quiz/config/vinos.json y
// productos con los mismos slugs, grupos y precios que el seed de Supabase (data/catalogo-inicial.json).
import { readFileSync } from "node:fs";
import { mergeCatalog } from "../lib/quiz/merge.ts";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
export const slugify = (t) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const preguntas = json("../quiz/config/preguntas.json");
export const perfiles = json("../quiz/config/perfiles.json").perfiles;
export const textos = json("../quiz/config/textos.json");
export const vinosQuiz = json("../quiz/config/vinos.json").vinos;
export const profiles = json("../wine-scan/knowledge/catalog-profiles.json").vinos;
export const config = { preguntas, perfiles };

const fuente = json("../data/catalogo-inicial.json").vinos;
export const products = fuente.map((v) => ({
  slug: slugify(v.nombre_oficial_excel),
  name: v.nombre_oficial_excel,
  group: v.grupo_color,
  priceCents: v.precio_mxn * 100,
  available: true,
}));
const marca = json("../data/catalogo-marca.json");
export const presets = marca.kits_prearmados.map((k) => ({
  slug: k.slug,
  items: k.items.map(([nombre, quantity]) => ({ slug: slugify(nombre), quantity })),
}));

export function catalogo(overrides = {}) {
  const prods = products.map((p) => ({ ...p, ...(overrides[p.slug] ?? {}) }));
  return mergeCatalog(profiles, vinosQuiz, prods, presets).catalog;
}

export const base = {
  ocasion: "diario",
  colores: ["tinto"],
  cafe: "leche",
  limonada: "equilibrada",
  textura: "media",
  aromas: ["frutas_rojas"],
  aventura: "variedad",
  presupuesto: "sin-tope",
};
