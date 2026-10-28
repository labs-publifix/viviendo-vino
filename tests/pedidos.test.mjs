// Reglas de Pedidos y Finanzas del panel: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { accionesPara, comisionMPEstimada, destino, margenBotella, precioMinimo, puedeVerPedido, repartoBroker, resumenFinanzas, validarAccion, validarNota, validarTransferencia, veCorreoCliente, veMargen, veParteAliado, veTotalCobrado } from "../lib/admin/pedidos-rules.ts";

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
  assert.deepEqual(["admin", "atencion", "aliado"].map(veMargen), [true, false, false]);
  assert.deepEqual(["admin", "atencion", "aliado"].map(veTotalCobrado), [true, true, false]);
  assert.deepEqual(["admin", "atencion", "aliado"].map(veParteAliado), [true, false, true]);
  assert.equal(veCorreoCliente("aliado"), false);
});

test("broker: margen por botella, precio mínimo y reparto del pedido", () => {
  // El ejemplo de Rafa: acordado 300, final 340 → 40 de margen (11.76 %).
  assert.deepEqual(margenBotella(34000, 30000), { centavos: 4000, bps: 1176 });
  // Con 15 % de margen mínimo, el final más bajo para un acordado de 300 es 353.
  assert.equal(precioMinimo(30000, 1500), 35300);
  assert.equal(precioMinimo(30000, 0), 30000);
  // Mercado Pago estimado: 3.49 % + $4, más IVA.
  assert.equal(comisionMPEstimada(200000), Math.round((200000 * 0.0349 + 400) * 1.16));
  assert.equal(comisionMPEstimada(0), 0);
  const r = repartoBroker([
    { precio: 34000, acordado: 30000, cantidad: 4 },
    { precio: 40000, acordado: 35000, cantidad: 2 },
  ]);
  assert.deepEqual([r.total, r.aliado, r.margen], [216000, 190000, 26000]);
  assert.equal(r.mp, comisionMPEstimada(216000));
});

test("finanzas: solo ventas pagadas; lo ganado es lo entregado y el saldo descuenta lo transferido", () => {
  const ventas = [
    { estado: "entregado", total: 100000, margen: 10000, aliado: 90000, mp: 4000 },
    { estado: "entregado", total: 200000, margen: 20000, aliado: 180000, mp: 8000 },
    { estado: "enviado", total: 100000, margen: 10000, aliado: 90000, mp: 4000 },
    { estado: "cancelado", total: 500000, margen: 50000, aliado: 450000, mp: 20000 },
    { estado: "pendiente_pago", total: 500000, margen: 50000, aliado: 450000, mp: 20000 },
  ];
  const r = resumenFinanzas(ventas, [{ monto: 100000 }]);
  assert.equal(r.ventas, 3);
  assert.equal(r.vendido, 400000);
  assert.equal(r.margen, 40000);
  assert.equal(r.mp, 16000);
  assert.equal(r.margenNeto, 24000);
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

test("correos: reenviar solo admin o atención y solo si el pedido ya llegó a ese paso", async () => {
  const { puedeReenviar } = await import("../lib/admin/pedidos-rules.ts");
  assert.equal(puedeReenviar("pedido_confirmado", "pagado", "admin"), true);
  assert.equal(puedeReenviar("pedido_confirmado", "entregado", "atencion"), true);
  assert.equal(puedeReenviar("pedido_enviado", "preparando", "admin"), false);
  assert.equal(puedeReenviar("pedido_enviado", "enviado", "admin"), true);
  assert.equal(puedeReenviar("pedido_entregado", "enviado", "admin"), false);
  assert.equal(puedeReenviar("pedido_confirmado", "cancelado", "admin"), false);
  assert.equal(puedeReenviar("pedido_confirmado", "pagado", "aliado"), false);
  assert.equal(puedeReenviar("pedido_equipo", "pagado", "admin"), false);
});

test("correos: el historial junta los avisos al equipo de un mismo momento", async () => {
  const { lineaDeTiempo } = await import("../lib/admin/pedidos-rules.ts");
  const t = (m) => new Date(Date.UTC(2026, 9, 27, 10, m)).toISOString();
  const lineas = lineaDeTiempo(
    [{ id: "e1", at: t(0), tipo: "creado", estado: "pagado", detalle: "", quien: "" }, { id: "e2", at: t(30), tipo: "estado", estado: "enviado", detalle: "", quien: "" }],
    [
      { id: "c1", at: t(1), tipo: "pedido_confirmado", para: "cliente", destinatario: "a@x.mx", ok: true, reenvio: false },
      { id: "c2", at: t(1), tipo: "pedido_equipo", para: "equipo", destinatario: "j@x.mx", ok: true, reenvio: false },
      { id: "c3", at: t(1), tipo: "pedido_equipo", para: "equipo", destinatario: "r@x.mx", ok: false, reenvio: false },
      { id: "c4", at: t(31), tipo: "pedido_enviado", para: "cliente", destinatario: "a@x.mx", ok: false, reenvio: false },
    ],
  );
  assert.deepEqual(lineas.map((l) => l.id), ["e1", "c1", "c2", "e2", "c4"]);
  const equipo = lineas.find((l) => l.id === "c2");
  assert.deepEqual([equipo.enviados, equipo.fallidos, equipo.destinatarios.length], [1, 1, 2]);
  assert.equal(lineas.find((l) => l.id === "c4").fallidos, 1);
});
