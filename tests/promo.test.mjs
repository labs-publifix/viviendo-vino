// Página de promoción /promo/<código>: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { armarPromo, fechaPromo, normalizarCodigoPromo } from "../lib/promo-rules.ts";

const BASE = {
  codigo: "VIVIENDOVINO",
  texto_publico: "-10% adicional en compras del 19 al 22 de noviembre 2026",
  tipo: "porcentaje",
  valor: 1000,
  tope_centavos: null,
  inicia_at: "2026-11-02T19:00:00Z",
  termina_at: "2026-11-23T05:59:00Z",
  usos_max: 10,
  usos_por_cliente: 1,
  min_kits: null,
  solo_primera_compra: false,
};

test("normaliza el código del enlace y rechaza lo que no es código", () => {
  assert.equal(normalizarCodigoPromo("viviendovino"), "VIVIENDOVINO");
  assert.equal(normalizarCodigoPromo("VIVIENDO-VINO"), "VIVIENDOVINO");
  assert.equal(normalizarCodigoPromo("ab"), null);
  assert.equal(normalizarCodigoPromo("<script>"), null);
  assert.equal(normalizarCodigoPromo("%E0%A4%A"), null);
});

test("titular, cifra y condiciones de un porcentaje", () => {
  const p = armarPromo(BASE, null);
  assert.equal(p.estado, "vigente");
  assert.equal(p.cifra, "10 %");
  assert.equal(p.titular, "10 % de descuento en tu kit");
  assert.ok(p.condiciones.includes("Válido hasta el domingo 22 de noviembre, 11:59 pm (hora del centro de México)."));
  assert.ok(p.condiciones.includes("Un uso por persona."));
  assert.ok(p.condiciones.includes("Cupo limitado."));
});

test("monto fijo, tope y estados", () => {
  const m = armarPromo({ ...BASE, tipo: "monto", valor: 20000, usos_max: null, usos_por_cliente: null }, null);
  assert.equal(m.titular, "$200 de descuento en tu compra");
  assert.equal(armarPromo({ ...BASE, tope_centavos: 50000 }, null).condiciones[0], "Hasta $500 de descuento.");
  assert.equal(armarPromo(BASE, "vencido").estado, "vencido");
  assert.equal(armarPromo(BASE, "agotado").estado, "agotado");
  const prog = armarPromo({ ...BASE, inicia_at: "2026-11-19T15:00:00Z" }, "programado");
  assert.equal(prog.estado, "programado");
  assert.equal(prog.inicia, "jueves 19 de noviembre a las 9:00");
});

test("fecha en hora del centro de México", () => {
  assert.equal(fechaPromo("2026-11-19T15:00:00Z"), "jueves 19 de noviembre a las 9:00");
});
