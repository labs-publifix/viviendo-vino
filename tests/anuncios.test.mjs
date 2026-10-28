// Marquesina programable (/admin/anuncios y la barra de la tienda): `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ANUNCIOS_RESPALDO, cdmxAIso, estado, fechaCorta, isoACdmx, limpiarEnlace, segundosAlSiguienteCambio, validarAnuncio, visibles } from "../lib/anuncios.ts";

const NOW = Date.parse("2026-11-01T18:00:00Z"); // 1 nov, 12:00 en CDMX
const a = (o) => ({ id: o.texto, enlace: null, orden: 0, activo: true, iniciaAt: null, terminaAt: null, ...o });

test("estado y visibles según encendido y programación", () => {
  const list = [
    a({ texto: "B", orden: 2 }),
    a({ texto: "A", orden: 1 }),
    a({ texto: "apagado", orden: 3, activo: false }),
    a({ texto: "futuro", orden: 4, iniciaAt: "2026-11-19T15:00:00Z" }),
    a({ texto: "pasado", orden: 5, terminaAt: "2026-10-31T00:00:00Z" }),
    a({ texto: "ventana", orden: 6, iniciaAt: "2026-11-01T00:00:00Z", terminaAt: "2026-11-02T00:00:00Z" }),
  ];
  assert.deepEqual(visibles(list, NOW).map((x) => x.texto), ["A", "B", "ventana"]);
  assert.equal(estado(list[3], NOW), "programado");
  assert.equal(estado(list[4], NOW), "terminado");
  assert.equal(estado(list[2], NOW), "apagado");
  // El próximo cambio es el fin de "ventana" (6 h), antes que el inicio de "futuro".
  assert.equal(segundosAlSiguienteCambio(list, NOW), 6 * 3600);
  assert.equal(segundosAlSiguienteCambio([a({ texto: "x" })], NOW), null);
});

test("hora de CDMX ida y vuelta", () => {
  assert.equal(cdmxAIso("2026-11-19T09:00"), "2026-11-19T15:00:00.000Z");
  assert.equal(isoACdmx("2026-11-19T15:00:00.000Z"), "2026-11-19T09:00");
  assert.equal(cdmxAIso("19/11/2026"), null);
  assert.equal(fechaCorta("2026-11-19T15:00:00.000Z"), "jue 19 de nov, 09:00");
});

test("enlaces: rutas de la tienda o https, nada más", () => {
  assert.equal(limpiarEnlace(""), null);
  assert.equal(limpiarEnlace(" /arma-tu-kit "), "/arma-tu-kit");
  assert.equal(limpiarEnlace("/#como-funciona"), "/#como-funciona");
  assert.equal(limpiarEnlace("https://wa.me/525512345678"), "https://wa.me/525512345678");
  for (const bad of ["//evil.com", "javascript:alert(1)", "http://x.com", "https://u:p@x.com", "arma-tu-kit", "/a b"]) assert.equal(limpiarEnlace(bad), "invalido", bad);
});

test("validarAnuncio: texto, enlace y fechas", () => {
  const ok = validarAnuncio({ texto: "  Abrimos el   jueves ", enlace: "", inicia: "2026-11-19T09:00", termina: "" });
  assert.deepEqual(ok, { ok: true, data: { texto: "Abrimos el jueves", enlace: null, iniciaAt: "2026-11-19T15:00:00.000Z", terminaAt: null } });
  const bad = validarAnuncio({ texto: "x".repeat(91), enlace: "//x", inicia: "2026-11-19T09:00", termina: "2026-11-19T08:00" });
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["enlace", "termina", "texto"]);
});

test("respaldo: los 4 mensajes de siempre y Cómo funciona", () => {
  assert.equal(ANUNCIOS_RESPALDO.length, 5);
  assert.ok(!ANUNCIOS_RESPALDO.some((x) => /compra mínima/i.test(x.texto)));
});

test("conPrecios: {desde} toma el precio real; sin precio, se quita la frase", async () => {
  const { conPrecios } = await import("../lib/anuncios.ts");
  const lista = [{ texto: "Arma tu kit desde {desde}", enlace: null }, { texto: "Envío incluido", enlace: null }];
  assert.deepEqual(conPrecios(lista, 204000).map((a) => a.texto), ["Arma tu kit desde $2,040", "Envío incluido"]);
  assert.deepEqual(conPrecios(lista, null).map((a) => a.texto), ["Arma tu kit", "Envío incluido"]);
});
