// Reglas del armador y del carrito (prueba c del plan): `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  KIT_SIZE,
  addBottle,
  canAdd,
  fullCaseOptions,
  kitGroup,
  removeBottle,
  validateKit,
} from "../lib/kit/rules.ts";

// Catálogo real (mismos precios que el seed), en el formato que usan las reglas.
const slugify = (t) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fuente = JSON.parse(readFileSync(new URL("../data/catalogo-inicial.json", import.meta.url), "utf8"));
const wines = new Map(
  fuente.vinos.map((v) => {
    const slug = slugify(v.nombre_oficial_excel);
    return [slug, { slug, name: v.nombre_oficial_excel, group: v.grupo_color, priceCents: v.precio_mxn * 100, available: true }];
  }),
);
const of = (group) => [...wines.values()].filter((w) => w.group === group).map((w) => w.slug);
const [azul1, azul2] = of("azul");
const [rojo1] = of("rojo");

test("la primera botella fija el grupo y las de otro grupo no caben", () => {
  let kit = addBottle([], azul1, wines);
  assert.equal(kitGroup(kit, wines), "azul");
  assert.deepEqual(canAdd(kit, rojo1, wines), { ok: false, reason: "other-group" });
  kit = addBottle(kit, rojo1, wines);
  assert.deepEqual(kit, [{ slug: azul1, quantity: 1 }], "agregar uno de otro grupo no cambia el kit");
});

test("repetición libre y tope de 6", () => {
  let kit = [];
  for (let i = 0; i < 8; i++) kit = addBottle(kit, azul1, wines);
  assert.deepEqual(kit, [{ slug: azul1, quantity: KIT_SIZE }]);
  assert.deepEqual(canAdd(kit, azul2, wines), { ok: false, reason: "full" });
  kit = removeBottle(kit, azul1);
  assert.equal(kit[0].quantity, 5);
  assert.deepEqual(removeBottle([{ slug: azul1, quantity: 1 }], azul1), []);
});

test("un vino agotado no se puede agregar", () => {
  const sinStock = new Map(wines);
  sinStock.set(azul2, { ...wines.get(azul2), available: false });
  assert.deepEqual(canAdd([], azul2, sinStock), { ok: false, reason: "sold-out" });
  const r = validateKit([{ slug: azul1, quantity: 5 }, { slug: azul2, quantity: 1 }], sinStock);
  assert.equal(r.ok, false);
  assert.equal(r.error, "sold-out");
});

test("el servidor rechaza grupos mezclados", () => {
  const r = validateKit([{ slug: azul1, quantity: 3 }, { slug: rojo1, quantity: 3 }], wines);
  assert.equal(r.ok, false);
  assert.equal(r.error, "mixed-groups");
});

test("el servidor exige exactamente 6 botellas", () => {
  for (const n of [1, 5]) {
    const r = validateKit([{ slug: azul1, quantity: n }], wines);
    assert.equal(r.ok, false);
    assert.equal(r.error, "wrong-size");
  }
  // 7 repartidas en renglones repetidos del mismo vino también se rechaza.
  const r7 = validateKit([{ slug: azul1, quantity: 4 }, { slug: azul1, quantity: 3 }], wines);
  assert.equal(r7.error, "wrong-size");
  assert.equal(validateKit([], wines).error, "empty");
  assert.equal(validateKit([{ slug: azul1, quantity: 0 }], wines).error, "invalid-quantity");
  assert.equal(validateKit([{ slug: azul1, quantity: 2.5 }], wines).error, "invalid-quantity");
  assert.equal(validateKit([{ slug: "no-existe", quantity: 6 }], wines).error, "unknown-wine");
});

test("los precios salen del catálogo, no de lo que mande el navegador", () => {
  const enviado = [{ slug: azul1, quantity: 4, priceCents: 1 }, { slug: azul2, quantity: 2, priceCents: 1 }];
  const r = validateKit(enviado, wines);
  assert.equal(r.ok, true);
  const esperado = 4 * wines.get(azul1).priceCents + 2 * wines.get(azul2).priceCents;
  assert.equal(r.totalCents, esperado);
  assert.ok(r.lines.every((l) => l.priceCents === wines.get(l.slug).priceCents));
});

test("rangos reales: kit azul más barato $1,800 y rojo más caro $8,610", () => {
  const precio = (slug) => wines.get(slug).priceCents;
  const barato = of("azul").sort((a, b) => precio(a) - precio(b))[0];
  const caro = of("rojo").sort((a, b) => precio(b) - precio(a))[0];
  assert.equal(validateKit([{ slug: barato, quantity: 6 }], wines).totalCents, 180000);
  assert.equal(validateKit([{ slug: caro, quantity: 6 }], wines).totalCents, 861000);
});

test("caja completa del grupo amarillo: 6 de cada uno y 3 y 3", () => {
  const amarillo = of("amarillo");
  const opciones = fullCaseOptions(amarillo);
  assert.equal(opciones.length, 3);
  for (const o of opciones) assert.equal(validateKit(o, wines).ok, true);
});
