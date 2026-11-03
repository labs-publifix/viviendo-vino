// Mercado Pago: montos, estados de orden, rechazos, datos del Brick y firma de los webhooks. `npm test`.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { ESTADO_MX, firmaValida, interpretarOrden, leerTarjeta, montoMP, textoRechazo } from "../lib/mercadopago/rules.ts";

test("montos y estados de México", () => {
  assert.equal(montoMP(184000), "1840.00");
  assert.equal(montoMP(12345), "123.45");
  // Los 32 estados del checkout (lib/checkout/schema.ts), cada uno con su código.
  assert.equal(Object.keys(ESTADO_MX).length, 32);
  for (const [s, c] of Object.entries(ESTADO_MX)) assert.match(c, /^MX-[A-Z]{3}$/, s);
  assert.equal(ESTADO_MX["Ciudad de México"], "MX-DIF");
});

test("qué significa cada orden para el pedido", () => {
  assert.deepEqual(interpretarOrden({ status: "processed", status_detail: "accredited", transactions: { payments: [{ status: "processed" }] } }), { tipo: "aprobado" });
  assert.deepEqual(
    interpretarOrden({ status: "action_required", status_detail: "pending_challenge", transactions: { payments: [{ status: "action_required", status_detail: "pending_challenge", payment_method: { transaction_security: { url: "https://www.mercadopago.com.mx/auth/x" } } }] } }),
    { tipo: "reto", url: "https://www.mercadopago.com.mx/auth/x" },
  );
  assert.deepEqual(interpretarOrden({ status: "processing", status_detail: "in_review" }), { tipo: "revision" });
  assert.deepEqual(interpretarOrden({ status: "in_review", status_detail: "in_review" }), { tipo: "revision" });
  assert.deepEqual(interpretarOrden({ status: "failed", status_detail: "failed", transactions: { payments: [{ status: "failed", status_detail: "insufficient_amount" }] } }), { tipo: "rechazado", detalle: "insufficient_amount" });
  assert.deepEqual(interpretarOrden({ status: "canceled", status_detail: "expired" }), { tipo: "rechazado", detalle: "expired" });
  assert.deepEqual(interpretarOrden({ status: "refunded", status_detail: "refunded" }), { tipo: "reembolsado" });
  assert.match(textoRechazo("insufficient_amount"), /fondos/);
  assert.match(textoRechazo("algo_nuevo"), /rechazó/);
});

test("datos del Brick: token, marca, tipo y un solo pago", () => {
  const ok = leerTarjeta({ token: "abc123DEF456", payment_method_id: "master", payment_type_id: "credit_card", installments: 1, payer: { identification: { type: "RFC", number: "XAXX010101000" } } });
  assert.deepEqual(ok, { token: "abc123DEF456", metodo: "master", tipo: "credit_card", identificacion: { type: "RFC", number: "XAXX010101000" } });
  assert.equal(leerTarjeta({ token: "abc123DEF456", payment_method_id: "master", payment_type_id: "credit_card", installments: 3 }), null);
  assert.equal(leerTarjeta({ token: "abc123DEF456", payment_method_id: "master", payment_type_id: "prepaid_card" }), null);
  assert.equal(leerTarjeta({ token: "x", payment_method_id: "master", payment_type_id: "debit_card" }), null);
  assert.equal(leerTarjeta(null), null);
});

test("firma de los webhooks (plantilla de la documentación)", () => {
  const secret = "s3cr3t";
  const ts = "1742505638683";
  const firma = (id, req) => createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");
  const v1 = firma("ord01m28p44g5fg8rjpm579eh56fv", "2066ca19-c6f1-498a-be75-1923005edd06");
  const base = { xSignature: `ts=${ts},v1=${v1}`, xRequestId: "2066ca19-c6f1-498a-be75-1923005edd06", dataId: "ORD01M28P44G5FG8RJPM579EH56FV", secret };
  assert.equal(firmaValida(base), true);
  assert.equal(firmaValida({ ...base, dataId: "ORD01OTRA" }), false);
  assert.equal(firmaValida({ ...base, secret: "otra" }), false);
  assert.equal(firmaValida({ ...base, xSignature: "ts=1,v1=zz" }), false);
  assert.equal(firmaValida({ ...base, ahora: Number(ts) + 60_000, toleranciaMs: 10 * 60_000 }), true);
  assert.equal(firmaValida({ ...base, ahora: Number(ts) + 3600_000, toleranciaMs: 10 * 60_000 }), false);
});
