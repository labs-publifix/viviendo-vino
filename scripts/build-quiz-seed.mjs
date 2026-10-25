// Genera supabase/seed/wine_profiles.sql a partir de wine-scan/knowledge/catalog-profiles.json (perfil de sabor,
// lista y grupo: única fuente de verdad) y quiz/config/vinos.json (aromas, ocasiones, platos y rol del quiz).
// Uso: npm run quiz:seed. El SQL es idempotente: se puede correr varias veces.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const perfiles = json("wine-scan/knowledge/catalog-profiles.json").vinos;
const quiz = json("quiz/config/vinos.json").vinos;

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const arr = (xs) => `array[${xs.map(q).join(", ")}]::text[]`;

const rows = perfiles.map((p) => {
  const x = quiz[p.slug];
  if (!x) throw new Error(`Falta ${p.slug} en quiz/config/vinos.json`);
  const f = p.perfil;
  return `  (${[q(p.slug), q(p.nombre), p.lista, q(p.grupo), f.cuerpo, f.acidez, f.tanino, f.dulzor, f.intensidad, arr(x.familias_aromaticas), arr(x.ocasiones), arr(x.platos), q(x.rol_kit), q(p.perfil_confianza)].join(", ")})`;
});

const sql = `-- Generado por scripts/build-quiz-seed.mjs. No editar a mano: cambia catalog-profiles.json o quiz/config/vinos.json
-- y vuelve a generar. Corre después de supabase/migrations/20261026000000_quiz.sql.
begin;

insert into public.wine_profiles (slug, nombre, lista, grupo, cuerpo, acidez, tanino, dulzor, intensidad, familias_aromaticas, ocasiones, platos, rol_kit, perfil_confianza) values
${rows.join(",\n")}
on conflict (slug) do update set nombre = excluded.nombre, lista = excluded.lista, grupo = excluded.grupo, cuerpo = excluded.cuerpo,
  acidez = excluded.acidez, tanino = excluded.tanino, dulzor = excluded.dulzor, intensidad = excluded.intensidad,
  familias_aromaticas = excluded.familias_aromaticas, ocasiones = excluded.ocasiones, platos = excluded.platos,
  rol_kit = excluded.rol_kit, perfil_confianza = excluded.perfil_confianza, updated_at = now();

-- Revisión: perfiles sin producto en la tienda (debe salir vacío).
-- select w.slug from public.wine_profiles w left join public.productos p on p.slug = w.slug where p.slug is null;

commit;
`;
writeFileSync(join(root, "supabase/seed/wine_profiles.sql"), sql);
console.log(`supabase/seed/wine_profiles.sql: ${rows.length} vinos`);
