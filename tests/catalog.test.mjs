// Precios y reglas del catálogo contra la fuente (prueba d del plan): `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const fuente = JSON.parse(readFileSync(new URL("../data/catalogo-inicial.json", import.meta.url), "utf8"));
const marca = JSON.parse(readFileSync(new URL("../data/catalogo-marca.json", import.meta.url), "utf8"));
const seed = readFileSync(new URL("../supabase/seed/catalogo.sql", import.meta.url), "utf8");

const vinos = fuente.vinos;
const byGroup = (g) => vinos.filter((v) => v.grupo_color === g).map((v) => v.precio_mxn);
const kitRange = (g) => [Math.min(...byGroup(g)) * 6, Math.max(...byGroup(g)) * 6];

test("19 etiquetas, de $300 a $1,435", () => {
  assert.equal(vinos.length, 19);
  const prices = vinos.map((v) => v.precio_mxn);
  assert.equal(Math.min(...prices), 300);
  assert.equal(Math.max(...prices), 1435);
});

test("rangos de kit por grupo", () => {
  assert.deepEqual(kitRange("azul"), [1800, 2430]);
  assert.deepEqual(kitRange("rojo"), [3270, 8610]);
  assert.deepEqual(kitRange("verde"), [2100, 2112]);
  assert.deepEqual(kitRange("amarillo"), [2790, 2970]);
  assert.deepEqual(
    ["azul", "rojo", "verde", "amarillo"].map((g) => byGroup(g).length),
    [11, 4, 2, 2],
  );
});

test("el seed carga cada precio del JSON en centavos, sin otros precios", () => {
  for (const v of vinos) {
    assert.ok(seed.includes(`'${v.nombre_oficial_excel.replace(/'/g, "''")}'`), v.nombre_oficial_excel);
  }
  const loaded = [...seed.matchAll(/insert into public\.productos .*? values \((.*)\)$/gm)].length;
  assert.equal(loaded, 19);
  for (const v of vinos) assert.ok(seed.includes(`, ${v.precio_mxn * 100}, `), `${v.nombre_oficial_excel} ${v.precio_mxn}`);
});

test("cada vino tiene texto en voz de marca distinto al del aliado", () => {
  for (const v of vinos) {
    const m = marca.vinos[v.nombre_oficial_excel];
    assert.ok(m?.descripcion, v.nombre_oficial_excel);
    assert.notEqual(m.descripcion, v.descripcion_aliado_texto_fuente, v.nombre_oficial_excel);
    assert.doesNotMatch(m.descripcion, /exclusiv|select[oa]|premium|el mejor|la mejor/i, v.nombre_oficial_excel);
  }
});

test("kits prearmados: 6 botellas del mismo grupo", () => {
  const grupo = Object.fromEntries(vinos.map((v) => [v.nombre_oficial_excel, v.grupo_color]));
  for (const k of marca.kits_prearmados) {
    assert.equal(k.items.reduce((s, [, n]) => s + n, 0), 6, k.slug);
    assert.equal(new Set(k.items.map(([n]) => grupo[n])).size, 1, k.slug);
  }
});
