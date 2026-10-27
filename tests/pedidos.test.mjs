// Reglas de Pedidos y Finanzas del panel: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { accionesPara, destino, puedeVerPedido, reparto, resumenFinanzas, validarAccion, validarNota, validarTransferencia, veCorreoCliente, veDinero } from "../lib/admin/pedidos-rules.ts";

test("acciones: el pago no se marca a mano salvo en un pedido de prueba, y solo un admin", () => {
  assert.deepEqual(accionesPara("pendiente_pago", "admin", false), ["cancelar"]);
  assert.deepEqual(accionesPara("pendiente_pago", "admin", true), ["marcar_pagado", "cancelar"]);
  assert.deepEqual(accionesPara("pendiente_pago", "atencion", true), []);
  assert.deepEqual(accionesPara("pendiente_pago", "aliado", true), []);
});

test("acciones: preparar → enviar → entregar para los tres roles; cancelar solo admin y antes de enviar", () => {
  for (const rol of ["admin", "atencion", "aliado"]) {
    assert.ok(accionesPara("pagado", rol, false).includes("preparar"), rol);
    assert.ok(accionesPara("preparando", rol, false).includes("enviar"), rol);
    assert.deepEqual(accionesPara("enviado", rol, false), ["entregar"], rol);
    assert.deepEqual(accionesPara("entregado", rol, false), [], rol);
    assert.deepEqual(accionesPara("cancelado", rol, false), [], rol);
  }
  assert.ok(accionesPara("preparando", "admin", false).includes("cancelar"));
  assert.ok(!accionesPara("preparando", "atencion", false).includes("cancelar"));
  assert.ok(!accionesPara("pagado", "aliado", false).includes("cancelar"));
  assert.equal(destino("enviar"), "enviado");
});

test("ver pedidos: el aliado solo los suyos; atención no ve dinero; el aliado no ve el correo", () => {
  assert.equal(puedeVerPedido({ rol: "aliado", aliadoId: "a" }, { aliadoId: "a" }), true);
  assert.equal(puedeVerPedido({ rol: "aliado", aliadoId: "a" }, { aliadoId: "b" }), false);
  assert.equal(puedeVerPedido({ rol: "aliado", aliadoId: null }, { aliadoId: "a" }), false);
  assert.equal(puedeVerPedido({ rol: "atencion", aliadoId: null }, { aliadoId: "a" }), true);
  assert.equal(veDinero("atencion"), false);
  assert.equal(veDinero("aliado"), true);
  assert.equal(veCorreoCliente("aliado"), false);
});

test("reparto: comisión redondeada al centavo y el resto para el aliado", () => {
  assert.deepEqual(reparto(180000, 1000), { comision: 18000, aliado: 162000 });
  assert.deepEqual(reparto(199999, 1250), { comision: 25000, aliado: 174999 });
  assert.deepEqual(reparto(0, 1000), { comision: 0, aliado: 0 });
});

test("finanzas: solo ventas pagadas; lo ganado es lo entregado y el saldo descuenta lo transferido", () => {
  const ventas = [
    { estado: "entregado", total: 100000, comision: 10000, aliado: 90000 },
    { estado: "entregado", total: 200000, comision: 20000, aliado: 180000 },
    { estado: "enviado", total: 100000, comision: 10000, aliado: 90000 },
    { estado: "cancelado", total: 500000, comision: 50000, aliado: 450000 },
    { estado: "pendiente_pago", total: 500000, comision: 50000, aliado: 450000 },
  ];
  const r = resumenFinanzas(ventas, [{ monto: 100000 }]);
  assert.equal(r.ventas, 3);
  assert.equal(r.vendido, 400000);
  assert.equal(r.comision, 40000);
  assert.equal(r.paraAliado, 360000);
  assert.equal(r.ganado, 270000);
  assert.equal(r.enCamino, 90000);
  assert.equal(r.transferido, 100000);
  assert.equal(r.saldo, 170000);
});

test("validaciones: guía al enviar, motivo al cancelar, nota y transferencia", () => {
  assert.equal(validarAccion("enviar", { paqueteria: "DHL", guia: "abc" }).ok, false);
  assert.equal(validarAccion("enviar", { paqueteria: "Correos", guia: "1234567890" }).ok, false);
  const ok = validarAccion("enviar", { paqueteria: "DHL", guia: " 12-ab-34 " });
  assert.deepEqual(ok, { ok: true, data: { paqueteria: "DHL", guia: "12-AB-34" } });
  assert.equal(validarAccion("cancelar", { motivo: "no" }).ok, false);
  assert.equal(validarAccion("cancelar", { motivo: "El cliente lo pidió" }).ok, true);
  assert.equal(validarAccion("preparar", {}).ok, true);
  assert.equal(validarNota("   ").ok, false);
  assert.equal(validarNota("x".repeat(301)).ok, false);

  const hoy = "2026-10-27";
  assert.deepEqual(validarTransferencia({ monto: "$4,860.50", fecha: "2026-10-20", referencia: " SPEI 123 ", nota: "" }, hoy), {
    ok: true,
    data: { monto_centavos: 486050, fecha: "2026-10-20", referencia: "SPEI 123", nota: null },
  });
  const malo = validarTransferencia({ monto: "-5", fecha: "2026-11-01", referencia: "", nota: "" }, hoy);
  assert.equal(malo.ok, false);
  assert.ok(malo.errors.monto && malo.errors.fecha);
});

test("formatMXNExacto: cuentas con centavos", async () => {
  const { formatMXNExacto } = await import("../lib/money.ts");
  assert.equal(formatMXNExacto(71750), "$717.50");
  assert.equal(formatMXNExacto(1216500), "$12,165.00");
  assert.equal(formatMXNExacto(-500), "-$5.00");
});
