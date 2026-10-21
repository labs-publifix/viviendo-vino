// Genera supabase/seed/catalogo.sql a partir de data/catalogo-inicial.json (precios y textos fuente del
// aliado) y data/catalogo-marca.json (textos en voz de marca y datos por vino).
// Uso: npm run seed:build. El SQL es idempotente: se puede correr varias veces.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fuente = JSON.parse(readFileSync(join(root, "data/catalogo-inicial.json"), "utf8"));
const marca = JSON.parse(readFileSync(join(root, "data/catalogo-marca.json"), "utf8"));

export function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const aliadoId = `(select id from public.aliados where slug = ${q(marca.aliado.slug)})`;
const grupoId = (codigo) => `(select id from public.grupos_botella where aliado_id = ${aliadoId} and codigo = ${q(codigo)})`;

const lines = [
  "-- Generado por scripts/build-seed.mjs. No editar a mano: cambia los JSON de data/ y vuelve a generar.",
  "-- Precios: data/catalogo-inicial.json (únicos válidos, con envío incluido).",
  "begin;",
  "",
  "insert into public.aliados (slug, nombre, ciudad, estado, comision_bps) values",
  `  (${[marca.aliado.slug, marca.aliado.nombre, marca.aliado.ciudad, marca.aliado.estado, marca.aliado.comision_bps].map(q).join(", ")})`,
  "on conflict (slug) do update set nombre = excluded.nombre, ciudad = excluded.ciudad, estado = excluded.estado, comision_bps = excluded.comision_bps;",
  "",
  `insert into public.configuracion_comercial (aliado_id, envio_incluido, tamano_kit) select id, true, 6 from public.aliados where slug = ${q(marca.aliado.slug)}`,
  "on conflict (aliado_id) do nothing;",
  "",
];

for (const g of marca.grupos) {
  lines.push(
    `insert into public.grupos_botella (aliado_id, codigo, nombre, descripcion, solo_caja_completa, orden) values (${aliadoId}, ${q(g.codigo)}, ${q(g.nombre)}, ${q(g.descripcion)}, ${g.solo_caja_completa}, ${g.orden})`,
    "on conflict (aliado_id, codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, solo_caja_completa = excluded.solo_caja_completa, orden = excluded.orden;",
  );
}
lines.push("");

for (const c of marca.categorias) {
  const introAliado = fuente.introducciones_categoria[c.slug] ?? null;
  lines.push(
    `insert into public.categorias (slug, nombre, intro, intro_aliado, orden) values (${q(c.slug)}, ${q(c.nombre)}, ${q(c.intro)}, ${q(introAliado)}, ${c.orden})`,
    "on conflict (slug) do update set nombre = excluded.nombre, intro = excluded.intro, intro_aliado = excluded.intro_aliado, orden = excluded.orden;",
  );
}
lines.push("");

const slugs = new Map();
fuente.vinos.forEach((v, i) => {
  const m = marca.vinos[v.nombre_oficial_excel];
  if (!m) throw new Error(`Falta el texto de marca de: ${v.nombre_oficial_excel}`);
  const slug = slugify(v.nombre_oficial_excel);
  if (slugs.has(slug)) throw new Error(`Slug repetido: ${slug}`);
  slugs.set(v.nombre_oficial_excel, slug);
  const precio = Math.round(v.precio_mxn * 100);
  const cols = {
    aliado_id: aliadoId,
    slug: q(slug),
    nombre_oficial: q(v.nombre_oficial_excel),
    nombre_comercial: q(v.nombre_comercial_pdf),
    productor: q(v.productor),
    categoria_slug: q(v.categoria),
    grupo_id: grupoId(v.grupo_color),
    tipo: q(m.tipo),
    uva: q(m.uva),
    region: q(m.region),
    denominacion: q(m.denominacion),
    anada: q(m.anada),
    precio_centavos: String(precio),
    premio: q(m.premio ?? null),
    descripcion: q(m.descripcion),
    descripcion_aliado: q(v.descripcion_aliado_texto_fuente),
    modo_venta: q("kit"),
    orden: String(i + 1),
  };
  const names = Object.keys(cols);
  lines.push(
    `insert into public.productos (${names.join(", ")}) values (${names.map((k) => cols[k]).join(", ")})`,
    `on conflict (slug) do update set ${names.filter((k) => k !== "slug").map((k) => `${k} = excluded.${k}`).join(", ")};`,
  );
});
lines.push("");

for (const k of marca.kits_prearmados) {
  lines.push(
    `insert into public.kits_prearmados (aliado_id, slug, nombre, descripcion, orden) values (${aliadoId}, ${q(k.slug)}, ${q(k.nombre)}, ${q(k.descripcion)}, ${k.orden})`,
    "on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, orden = excluded.orden;",
    `delete from public.kits_prearmados_items where kit_id = (select id from public.kits_prearmados where slug = ${q(k.slug)});`,
  );
  for (const [nombre, cantidad] of k.items) {
    const slug = slugs.get(nombre);
    if (!slug) throw new Error(`Kit ${k.slug}: vino desconocido ${nombre}`);
    lines.push(
      `insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = ${q(k.slug)}), (select id from public.productos where slug = ${q(slug)}), ${cantidad});`,
    );
  }
}
lines.push("", "commit;", "");

const out = join(root, "supabase/seed/catalogo.sql");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n"));

// Un solo archivo con tablas + catálogo, para pegar de una vez en el SQL Editor de Supabase.
const migration = readFileSync(join(root, "supabase/migrations/20261023000000_catalogo.sql"), "utf8");
writeFileSync(
  join(root, "supabase/seed/catalogo-completo.sql"),
  `-- Tablas del catálogo + carga de las 19 etiquetas. Generado por scripts/build-seed.mjs.\n\n${migration}\n${lines.join("\n")}`,
);
console.log(`OK: ${fuente.vinos.length} vinos, ${marca.kits_prearmados.length} kits → supabase/seed/catalogo.sql`);
