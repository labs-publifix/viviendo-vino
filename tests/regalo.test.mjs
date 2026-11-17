// Descorchador de la lista de espera: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { calificaDescorchador, correoLista } from "../lib/lista/regalo-rules.ts";

const V = {
  cierreRegistroMs: Date.parse("2026-11-16T23:59:00-06:00"),
  inicioMs: Date.parse("2026-11-19T09:00:00-06:00"),
  finMs: Date.parse("2026-11-21T09:00:00-06:00"),
};
const enLista = { creadoAt: "2026-11-10T12:00:00-06:00", origen: null };
const t = (s) => Date.parse(s);

test("de la lista y paga en la ventana: lleva descorchador", () => {
  assert.equal(calificaDescorchador(enLista, t("2026-11-19T09:00:00-06:00"), V), true);
  assert.equal(calificaDescorchador({ ...enLista, origen: "amigo-whatsapp" }, t("2026-11-20T18:00:00-06:00"), V), true);
});

test("compras antes de la apertura o después de las 48 horas: no", () => {
  assert.equal(calificaDescorchador(enLista, t("2026-11-18T12:00:00-06:00"), V), false);
  assert.equal(calificaDescorchador(enLista, t("2026-11-19T08:59:59-06:00"), V), false);
  assert.equal(calificaDescorchador(enLista, t("2026-11-21T09:00:00-06:00"), V), false);
});

test("sin lista, apuntados después del cierre o por guía/quiz: no", () => {
  const dentro = t("2026-11-19T10:00:00-06:00");
  assert.equal(calificaDescorchador(null, dentro, V), false);
  assert.equal(calificaDescorchador({ creadoAt: "2026-11-16T23:59:00-06:00", origen: null }, dentro, V), false);
  assert.equal(calificaDescorchador({ ...enLista, origen: "guia:guia-de-maridaje" }, dentro, V), false);
  assert.equal(calificaDescorchador({ ...enLista, origen: "quiz:fresco-directo" }, dentro, V), false);
  assert.equal(calificaDescorchador(enLista, null, V), false);
});

test("el correo del pedido se compara como en la lista", () => {
  assert.equal(correoLista("  Ana@Example.COM "), "ana@example.com");
});
