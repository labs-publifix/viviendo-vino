// Códigos de descuento: cálculo, piso de margen (modelo broker), estado y formulario del panel. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { comisionMPEstimada } from "../lib/admin/pedidos-rules.ts";
import {
  aplicarDescuento,
  cdmxAIso,
  codigoValido,
  descuentoNominal,
  estadoCodigo,
  generarCodigo,
  isoACdmx,
  normalizarCodigo,
  textoMotivo,
  textoValor,
  totalMinimo,
  validarCodigo,
} from "../lib/descuentos/rules.ts";

test("normalizar y generar códigos", () => {
  assert.equal(normalizarCodigo(" verano-10 "), "VERANO10");
  assert.equal(codigoValido("ab"), false);
  assert.equal(codigoValido("bienvenida2026"), true);
  assert.equal(codigoValido("café"), false);
  let i = 0;
  const azar = () => [0, 0.5, 0.99][i++ % 3];
  const g = generarCodigo("vv", azar);
  assert.match(g, /^VV[A-Z2-9]{8}$/);
  assert.doesNotMatch(generarCodigo(), /[01OIL]/);
});

test("descuento nominal: porcentaje al peso, con tope, y monto fijo", () => {
  assert.equal(descuentoNominal({ tipo: "porcentaje", valor: 1000, topeCentavos: null }, 184000), 18400);
  assert.equal(descuentoNominal({ tipo: "porcentaje", valor: 1250, topeCentavos: null }, 184000), 23000);
  assert.equal(descuentoNominal({ tipo: "porcentaje", valor: 1500, topeCentavos: 30000 }, 400000), 30000);
  assert.equal(descuentoNominal({ tipo: "monto", valor: 20000, topeCentavos: null }, 184000), 20000);
  assert.equal(descuentoNominal({ tipo: "monto", valor: 500000, topeCentavos: null }, 184000), 184000);
});

test("piso: total − comisión de MP nunca queda debajo de lo del aliado", () => {
  for (const a of [180000, 184000, 360000, 1000000]) {
    const t = totalMinimo(a);
    assert.ok(t - comisionMPEstimada(t) >= a, `cubre ${a}`);
    assert.ok(t - 1 - comisionMPEstimada(t - 1) < a, `es el mínimo para ${a}`);
  }
  // Margen 0 (precio público = acordado): no hay de dónde descontar.
  assert.deepEqual(aplicarDescuento({ tipo: "porcentaje", valor: 1000, topeCentavos: null }, 180000, 180000), { descuento: 0, recortado: true, nominal: 18000 });
  // Kit de $2,400 con acordado $1,800: el 10 % ($240) cabe.
  assert.deepEqual(aplicarDescuento({ tipo: "porcentaje", valor: 1000, topeCentavos: null }, 240000, 180000), { descuento: 24000, recortado: false, nominal: 24000 });
  // 30 % no cabe: se recorta al máximo posible, en pesos cerrados.
  const r = aplicarDescuento({ tipo: "porcentaje", valor: 3000, topeCentavos: null }, 240000, 180000);
  assert.equal(r.recortado, true);
  assert.equal(r.descuento % 100, 0);
  const total = 240000 - r.descuento;
  assert.ok(total - comisionMPEstimada(total) >= 180000);
});

test("estado del código", () => {
  const ahora = Date.parse("2026-11-10T12:00:00Z");
  const base = { activo: true, iniciaAt: "2026-11-01T00:00:00Z", terminaAt: "2026-11-30T00:00:00Z", usosMax: 100 };
  assert.equal(estadoCodigo(base, 3, ahora), "activo");
  assert.equal(estadoCodigo({ ...base, activo: false }, 3, ahora), "pausado");
  assert.equal(estadoCodigo({ ...base, iniciaAt: "2026-11-15T00:00:00Z" }, 0, ahora), "programado");
  assert.equal(estadoCodigo({ ...base, terminaAt: "2026-11-05T00:00:00Z" }, 0, ahora), "vencido");
  assert.equal(estadoCodigo(base, 100, ahora), "agotado");
  assert.equal(estadoCodigo({ ...base, usosMax: null, terminaAt: null }, 9999, ahora), "activo");
});

test("textos para el cliente y del valor", () => {
  assert.equal(textoMotivo("no_existe"), "Este código no es válido o ya venció.");
  assert.equal(textoMotivo("vencido"), textoMotivo("no_existe"));
  assert.equal(textoMotivo("min_kits", { minKits: 2 }), "Este código aplica en compras desde 2 kits.");
  assert.equal(textoValor({ tipo: "porcentaje", valor: 1250, topeCentavos: 30000 }), "12.5 % (hasta $300)");
  assert.equal(textoValor({ tipo: "monto", valor: 20000, topeCentavos: null }), "$200");
});

test("formulario del panel", () => {
  const ahora = Date.parse("2026-11-10T12:00:00Z");
  const ok = validarCodigo(
    { codigo: "verano 10", descripcion: " Instagram ", texto_publico: "10 % en tu compra hasta el 30 de noviembre", tipo: "porcentaje", valor: "10", tope: "300", inicia: "", termina: "2026-11-30T23:59", usos_max: "100", usos_por_cliente: "1", min_kits: "", solo_primera_compra: false },
    ahora,
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.data.codigo, "VERANO10");
  assert.equal(ok.data.valor, 1000);
  assert.equal(ok.data.tope_centavos, 30000);
  assert.equal(ok.data.inicia_at, new Date(ahora).toISOString());
  assert.equal(ok.data.termina_at, "2026-12-01T05:59:00.000Z");
  assert.equal(ok.data.min_kits, null);
  const monto = validarCodigo({ codigo: "BIENVENIDA", descripcion: "", texto_publico: "$200 en tu primera compra", tipo: "monto", valor: "200", tope: "999", inicia: "", termina: "", usos_max: "", usos_por_cliente: "", min_kits: "2", solo_primera_compra: true }, ahora);
  assert.equal(monto.ok, true);
  assert.equal(monto.data.valor, 20000);
  assert.equal(monto.data.tope_centavos, null);
  assert.equal(monto.data.min_kits, 2);
  assert.equal(monto.data.usos_por_cliente, null);
  const bad = validarCodigo({ codigo: "a", descripcion: "", texto_publico: "x", tipo: "porcentaje", valor: "95", tope: "abc", inicia: "2026-11-20T10:00", termina: "2026-11-19T10:00", usos_max: "0", usos_por_cliente: "-1", min_kits: "20", solo_primera_compra: false }, ahora);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["codigo", "min_kits", "termina", "texto_publico", "tope", "usos_max", "usos_por_cliente", "valor"]);
  assert.equal(isoACdmx(cdmxAIso("2026-11-19T09:00")), "2026-11-19T09:00");
});
