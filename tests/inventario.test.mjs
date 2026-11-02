// Reglas del inventario y límites del armador por existencias: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { addBottle, bottlesBySlug, canAdd, stockIssues, stockMessage } from "../lib/kit/rules.ts";
import {
  cruce,
  cuentaRegresiva,
  estadoInventario,
  huellaCarrito,
  leerFaltantes,
  puedeAjustarInventario,
  textoFaltante,
  validarCambio,
  validarFijar,
} from "../lib/inventario/rules.ts";

const wines = new Map([
  ["a", { slug: "a", name: "Vino A", group: "azul", priceCents: 30000, available: true, stock: 2 }],
  ["b", { slug: "b", name: "Vino B", group: "azul", priceCents: 30000, available: true, stock: null }],
  ["c", { slug: "c", name: "Vino C", group: "azul", priceCents: 30000, available: false, stock: 0 }],
]);

test("el armador no deja pasar de las botellas que hay, contando los demás kits del carrito", () => {
  let kit = addBottle([], "a", wines);
  kit = addBottle(kit, "a", wines);
  assert.deepEqual(kit, [{ slug: "a", quantity: 2 }]);
  assert.deepEqual(canAdd(kit, "a", wines), { ok: false, reason: "no-stock", left: 2 });
  assert.deepEqual(addBottle(kit, "a", wines), kit);
  // Sin límite conocido: sigue las reglas de siempre.
  assert.equal(canAdd(kit, "b", wines).ok, true);
  // Otro kit del carrito ya lleva 1 de "a": en este solo cabe 1 más.
  const otros = bottlesBySlug([[{ slug: "a", quantity: 1 }]]);
  const uno = addBottle([], "a", wines, otros);
  assert.deepEqual(canAdd(uno, "a", wines, otros), { ok: false, reason: "no-stock", left: 2 });
  assert.deepEqual(canAdd([], "c", wines), { ok: false, reason: "sold-out" });
});

test("stockIssues suma todos los kits del carrito", () => {
  const issues = stockIssues([[{ slug: "a", quantity: 2 }, { slug: "b", quantity: 4 }], [{ slug: "a", quantity: 1 }, { slug: "b", quantity: 5 }]], wines);
  assert.deepEqual(issues, [{ slug: "a", name: "Vino A", requested: 3, left: 2 }]);
  assert.equal(stockMessage("Vino A", 2), "Solo quedan 2 botellas de Vino A.");
  assert.equal(stockMessage("Vino A", 1), "Solo queda 1 botella de Vino A.");
  assert.equal(stockMessage("Vino A", 0), "Vino A se agotó.");
});

test("estado, umbrales y avisos solo al cruzar hacia abajo", () => {
  assert.equal(estadoInventario(0), "agotado");
  assert.equal(estadoInventario(3), "pocas");
  assert.equal(estadoInventario(4), "ok");
  assert.equal(cruce(10, 3), "pocas");
  assert.equal(cruce(4, 2), "pocas");
  assert.equal(cruce(3, 2), null); // ya estaba en pocas: no se repite el correo
  assert.equal(cruce(2, 0), "agotado");
  assert.equal(cruce(10, 0), "agotado");
  assert.equal(cruce(0, 5), null);
  assert.equal(cruce(5, 4), null);
});

test("permisos: admin todos, aliado los suyos, atención solo consulta", () => {
  assert.equal(puedeAjustarInventario({ rol: "admin", aliadoId: null }, { aliadoId: "x" }), true);
  assert.equal(puedeAjustarInventario({ rol: "aliado", aliadoId: "x" }, { aliadoId: "x" }), true);
  assert.equal(puedeAjustarInventario({ rol: "aliado", aliadoId: "y" }, { aliadoId: "x" }), false);
  assert.equal(puedeAjustarInventario({ rol: "aliado", aliadoId: null }, { aliadoId: "x" }), false);
  assert.equal(puedeAjustarInventario({ rol: "atencion", aliadoId: null }, { aliadoId: "x" }), false);
});

test("validaciones del panel", () => {
  assert.equal(validarCambio(3), 3);
  assert.equal(validarCambio(-1), -1);
  assert.equal(validarCambio(0), null);
  assert.equal(validarCambio(1.5), null);
  assert.equal(validarCambio("2"), null);
  assert.deepEqual(validarFijar({ valor: " 24 ", motivo: "conteo", nota: "  Conteo   del lunes " }), { ok: true, data: { valor: 24, motivo: "conteo", nota: "Conteo del lunes" } });
  assert.deepEqual(validarFijar({ valor: "0", motivo: "merma", nota: "" }), { ok: true, data: { valor: 0, motivo: "merma", nota: null } });
  const bad = validarFijar({ valor: "-1", motivo: "venta", nota: "x".repeat(201) });
  assert.deepEqual(Object.keys(bad.errors).sort(), ["motivo", "nota", "valor"]);
  assert.equal(validarFijar({ valor: "10000", motivo: "conteo", nota: "" }).ok, false);
});

test("faltantes de la base, textos, cuenta regresiva y huella del carrito", () => {
  const f = leerFaltantes('[{"producto_id":"p1","slug":"a","nombre":"Vino A","pedidas":3,"disponibles":1}]');
  assert.deepEqual(f, [{ productoId: "p1", slug: "a", nombre: "Vino A", pedidas: 3, disponibles: 1 }]);
  assert.deepEqual(leerFaltantes("no es json"), []);
  assert.equal(textoFaltante(f[0]), "Vino A: tienes 3 en tu carrito y queda 1.");
  assert.equal(textoFaltante({ nombre: "Vino A", pedidas: 3, disponibles: 0 }), "Vino A se agotó.");
  assert.equal(cuentaRegresiva(30 * 60_000), "30:00");
  assert.equal(cuentaRegresiva(61_500), "1:02");
  assert.equal(cuentaRegresiva(-5), "0:00");
  const k1 = [{ items: [{ slug: "b", quantity: 2 }, { slug: "a", quantity: 4 }] }];
  const k2 = [{ items: [{ slug: "a", quantity: 3 }, { slug: "b", quantity: 2 }, { slug: "a", quantity: 1 }] }];
  assert.equal(huellaCarrito(k1), huellaCarrito(k2));
  assert.notEqual(huellaCarrito(k1), huellaCarrito([{ items: [{ slug: "a", quantity: 6 }] }]));
});
