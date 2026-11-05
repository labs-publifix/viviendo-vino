// Formulario de contacto: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTACTO } from "../lib/contacto.ts";
import { MENSAJE_MAX, contactoSchema, erroresContacto, esBot, motivoDeUrl } from "../lib/contacto-form.ts";

const base = { nombre: "Ana Prueba", correo: "ana@example.com", telefono: "", motivo: "pedido", mensaje: "Quiero saber de mi pedido.", privacidad: true };

test("un mensaje completo pasa y se limpia", () => {
  const r = contactoSchema.safeParse({ ...base, nombre: "  Ana   Prueba ", correo: " ANA@Example.com " });
  assert.ok(r.success);
  assert.equal(r.data.nombre, "Ana Prueba");
  assert.equal(r.data.correo, "ana@example.com");
});

test("faltan datos: cada campo tiene su error", () => {
  const r = contactoSchema.safeParse({ nombre: "", correo: "no-es-correo", motivo: "precio", mensaje: "", privacidad: false });
  assert.ok(!r.success);
  const e = erroresContacto(r.error);
  for (const k of ["nombre", "correo", "motivo", "mensaje", "privacidad"]) assert.ok(e[k], k);
});

test("mensaje de más de 2000 caracteres no pasa", () => {
  assert.ok(!contactoSchema.safeParse({ ...base, mensaje: "a".repeat(MENSAJE_MAX + 1) }).success);
  assert.ok(contactoSchema.safeParse({ ...base, mensaje: "a".repeat(MENSAJE_MAX) }).success);
});

test("teléfono opcional, solo números y signos", () => {
  assert.ok(contactoSchema.safeParse({ ...base, telefono: "+52 229 278 1916" }).success);
  assert.ok(!contactoSchema.safeParse({ ...base, telefono: "llámame" }).success);
});

test("?motivo= preselecciona solo motivos válidos", () => {
  assert.equal(motivoDeUrl("marketing"), "marketing");
  assert.equal(motivoDeUrl("ia"), "ia");
  assert.equal(motivoDeUrl("etiquetas"), "etiquetas");
  assert.equal(motivoDeUrl("regalos"), "regalos");
  assert.equal(motivoDeUrl(["pedido", "otro"]), "pedido");
  assert.equal(motivoDeUrl("<script>"), "");
  assert.equal(motivoDeUrl(undefined), "");
});

test("anti-spam: campo oculto lleno o envío demasiado rápido", () => {
  const ahora = 1_000_000;
  assert.equal(esBot("", ahora - 10_000, ahora), false);
  assert.equal(esBot("http://spam", ahora - 10_000, ahora), true);
  assert.equal(esBot("", ahora - 500, ahora), true);
  assert.equal(esBot("", undefined, ahora), true);
});

test("constantes de contacto: teléfono, correo y domicilio oficiales", () => {
  assert.equal(CONTACTO.telefono.texto, "229 132 5000");
  assert.equal(CONTACTO.telefono.href, "tel:+522291325000");
  assert.equal(CONTACTO.correo.texto, "hola@viviendovino.com");
  assert.equal(CONTACTO.correo.href, "mailto:hola@viviendovino.com");
  assert.ok(CONTACTO.domicilio.texto.includes("Boca del Río, Ver."));
  assert.ok(CONTACTO.domicilio.mapa.startsWith("https://www.google.com/maps/search/?api=1&query=Bv.%20Adolfo"));
  assert.ok(CONTACTO.whatsapp.href.startsWith("https://wa.me/522291325000?text=Hola%2C%20vengo"));
});
