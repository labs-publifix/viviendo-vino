// Catálogo y Aliados en el panel: precios, permisos por rol, validaciones y kits. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bpsATexto, camposEditables, centavosATexto, clabeValida, comisionABps, pesos, precioACentavos, puedeCambiarDisponible,
  slugify, validarAliado, validarKit, validarVino,
} from "../lib/admin/catalogo-rules.ts";

test("permisos: solo admin toca precios; el aliado solo disponible/agotado de sus vinos", () => {
  assert.equal(camposEditables("admin"), "todo");
  assert.equal(camposEditables("aliado"), "disponible");
  assert.equal(camposEditables("atencion"), "nada");
  assert.equal(puedeCambiarDisponible({ rol: "aliado", aliadoId: "a1" }, { aliadoId: "a1" }), true);
  assert.equal(puedeCambiarDisponible({ rol: "aliado", aliadoId: "a1" }, { aliadoId: "a2" }), false);
  assert.equal(puedeCambiarDisponible({ rol: "aliado", aliadoId: null }, { aliadoId: "a1" }), false);
  assert.equal(puedeCambiarDisponible({ rol: "atencion", aliadoId: null }, { aliadoId: "a1" }), false);
  assert.equal(puedeCambiarDisponible({ rol: "admin", aliadoId: null }, { aliadoId: "a1" }), true);
});

test("dinero: precios y comisión", () => {
  assert.equal(precioACentavos("450"), 45000);
  assert.equal(precioACentavos("$1,435.50"), 143550);
  for (const bad of ["", "0", "-5", "abc", "12.345", "1234567"]) assert.equal(precioACentavos(bad), null, bad);
  assert.equal(centavosATexto(45000), "450");
  assert.equal(centavosATexto(143550), "1435.50");
  assert.equal(pesos(180000), "$1,800");
  assert.equal(comisionABps("10"), 1000);
  assert.equal(comisionABps("12.5%"), 1250);
  assert.equal(comisionABps("101"), null);
  assert.equal(bpsATexto(1250), "12.5");
});

test("slugify y CLABE", () => {
  assert.equal(slugify("Rosé 921 Collevento – Extra Dry"), "rose-921-collevento-extra-dry");
  assert.equal(slugify("Selezione d’Oro"), "selezione-doro");
  assert.equal(clabeValida("002010077777777771"), true);
  assert.equal(clabeValida("002010077777777772"), false);
  assert.equal(clabeValida("12345"), false);
});

const aliadoBase = { nombre: "In Vino Veritas", ciudad: "Córdoba", estado: "Veracruz", comision: "10", plazo_dias: "2", plazo_texto: "", razon_social: "", rfc: "", contacto_nombre: "", contacto_telefono: "", contacto_email: "", clabe: "", notas: "" };

test("validarAliado", () => {
  const ok = validarAliado(aliadoBase);
  assert.equal(ok.ok, true);
  assert.equal(ok.data.comision_bps, 1000);
  assert.equal(ok.data.plazo_preparacion_dias, 2);
  assert.equal(ok.data.privados.rfc, null);
  const bad = validarAliado({ ...aliadoBase, nombre: "", comision: "x", rfc: "ABC", clabe: "002010077777777772", contacto_email: "no" });
  assert.deepEqual(Object.keys(bad.errors).sort(), ["clabe", "comision", "contacto_email", "nombre", "rfc"]);
  assert.equal(validarAliado({ ...aliadoBase, rfc: "ivv-010203-ab1" }).data.privados.rfc, "IVV010203AB1");
});

const vinoBase = { nombre_oficial: "Soave DOC 2024", productor: "Levorato", categoria_slug: "blancos-rosado", grupo_id: "g1", tipo: "blanco", uva: "Garganega", region: "Véneto", denominacion: "DOC", anada: "2024", volumen_ml: "750", grado_alcohol: "12", precio: "450", premio: "", descripcion: "Blanco del Véneto, fresco y floral, para la mesa de todos los días.", descripcion_aliado: "" };
const opciones = { categorias: ["blancos-rosado", "tintos"], grupos: ["g1"] };

test("validarVino", () => {
  const ok = validarVino(vinoBase, opciones);
  assert.equal(ok.ok, true);
  assert.equal(ok.data.precio_centavos, 45000);
  assert.equal(ok.data.premio, null);
  const bad = validarVino({ ...vinoBase, precio: "0", grupo_id: "otro", tipo: "naranja", anada: "24", descripcion: "corta" }, opciones);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["anada", "descripcion", "grupo_id", "precio", "tipo"]);
});

test("validarKit: 6 botellas, mismo grupo, activas y del aliado", () => {
  const vinos = [
    { id: "a", grupoId: "azul", activo: true, aliadoId: "x" },
    { id: "b", grupoId: "azul", activo: true, aliadoId: "x" },
    { id: "c", grupoId: "rojo", activo: true, aliadoId: "x" },
    { id: "d", grupoId: "azul", activo: false, aliadoId: "x" },
  ];
  assert.equal(validarKit([{ productoId: "a", cantidad: 3 }, { productoId: "b", cantidad: 3 }], vinos, "x"), null);
  assert.match(validarKit([{ productoId: "a", cantidad: 3 }, { productoId: "b", cantidad: 2 }], vinos, "x"), /suma 5/);
  assert.match(validarKit([{ productoId: "a", cantidad: 3 }, { productoId: "c", cantidad: 3 }], vinos, "x"), /mismo grupo/);
  assert.match(validarKit([{ productoId: "a", cantidad: 3 }, { productoId: "d", cantidad: 3 }], vinos, "x"), /visibles/);
  assert.match(validarKit([{ productoId: "a", cantidad: 3 }, { productoId: "a", cantidad: 3 }], vinos, "x"), /una sola vez/);
  assert.match(validarKit([{ productoId: "a", cantidad: 6 }], vinos, "otro"), /ya no existe/);
});
