// Reglas del panel /admin y su paso por el interruptor de apertura: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../lib/gate.ts";
import { initials, menuFor, needsAdminSession, passwordProblem, safeAdminNext, SECCIONES } from "../lib/admin/rules.ts";

const ADMIN_ROUTES = ["/admin", "/admin/acceso", "/admin/recuperar", "/admin/contrasena", "/admin/pedidos", "/admin/catalogo"];

test("producción cerrada: el panel no existe (hasta aprobar su paso a www)", () => {
  const env = { storeOpen: false, preview: false, vercelEnv: "production" };
  for (const pathname of ADMIN_ROUTES) {
    assert.deepEqual(decide({ pathname, host: "www.viviendovino.com", env, hasPreviewAccess: false }), { action: "not-found" }, pathname);
  }
});

test("preview: el panel pide primero la contraseña del preview", () => {
  const env = { storeOpen: true, preview: true, vercelEnv: "preview" };
  for (const pathname of ADMIN_ROUTES) {
    assert.equal(decide({ pathname, host: "dev.viviendovino.com", env, hasPreviewAccess: false }).action, "login", pathname);
  }
});

test("needsAdminSession: solo entrar y crear contraseña se abren sin sesión", () => {
  for (const p of ["/admin", "/admin/pedidos", "/admin/catalogo/vinos/x", "/admin/configuracion"]) assert.equal(needsAdminSession(p), true, p);
  for (const p of ["/admin/acceso", "/admin/recuperar", "/admin/contrasena", "/inicio", "/administrador", "/"]) assert.equal(needsAdminSession(p), false, p);
});

test("safeAdminNext: solo destinos dentro del panel", () => {
  assert.equal(safeAdminNext("/admin/pedidos"), "/admin/pedidos");
  for (const v of [undefined, "", "//evil.com", "https://evil.com", "/inicio", "/admin\\..\\x", "/admin/acceso"]) assert.equal(safeAdminNext(v), "/admin", String(v));
});

test("passwordProblem: largo, correo y contraseñas predecibles", () => {
  assert.match(passwordProblem("corta", "a@b.mx"), /al menos 10/);
  assert.match(passwordProblem("x".repeat(73), "a@b.mx"), /máximo 72/);
  assert.match(passwordProblem("rafael aguirre 2026", "rafael@x.mx"), /correo/);
  assert.match(passwordProblem("aaaaaaaaaaaa", "a@b.mx"), /predecible/);
  assert.match(passwordProblem("Password12345", "a@b.mx"), /predecible/);
  assert.equal(passwordProblem("uvas de otoño 2026", "rafael@x.mx"), null);
  // Sin correo (revisión previa a gastar el enlace) no se aplica la regla del correo.
  assert.equal(passwordProblem("rafael aguirre 2026", ""), null);
});

test("menú: el admin ve las 9 secciones; aliado y atención no ven finanzas ni auditoría", () => {
  assert.equal(SECCIONES.filter((s) => s.roles.includes("admin")).length, 9);
  for (const rol of ["aliado", "atencion"]) {
    const hrefs = SECCIONES.filter((s) => s.roles.includes(rol)).map((s) => s.href);
    assert.ok(!hrefs.includes("/admin/finanzas") && !hrefs.includes("/admin/auditoria"), rol);
  }
});

test("menuFor: grupos sin secciones vacías; atención solo ve Operación y Sistema", () => {
  assert.deepEqual(menuFor("admin").map((g) => g.label), ["Operación", "Sitio", "Sistema"]);
  assert.deepEqual(menuFor("atencion").map((g) => g.label), ["Operación", "Sistema"]);
  assert.deepEqual(menuFor("atencion").flatMap((g) => g.secciones.map((s) => s.label)), ["Inicio", "Pedidos", "Configuración"]);
});

test("initials: iniciales del avatar", () => {
  assert.equal(initials("José Bermúdez"), "JB");
  assert.equal(initials("Rafael Aguirre"), "RA");
  assert.equal(initials("  Ana "), "A");
  assert.equal(initials(""), "?");
});

import { estadoEspera, fechaCdmx, origenLabel, toCsv } from "../lib/admin/comunidad-format.ts";

test("comunidad: origen de cada registro", () => {
  const perfiles = { "fresco-directo": "Fresco y directo" };
  const guias = { "guia-de-temperaturas-para-servir-vino": "Guía de temperaturas" };
  assert.equal(origenLabel(null, perfiles, guias), "Sitio");
  assert.equal(origenLabel("quiz:fresco-directo", perfiles, guias), "Quiz · Fresco y directo");
  // source recortado a 40 caracteres
  assert.equal(origenLabel("guia:guia-de-temperaturas-para-servir-vi", perfiles, guias), "Guía · Guía de temperaturas");
  assert.equal(origenLabel("instagram", perfiles, guias), "Enlace · instagram");
});

test("comunidad: estado y fecha en hora de CDMX", () => {
  assert.equal(estadoEspera({}), "activa");
  assert.equal(estadoEspera({ purchased_at: "2026-11-20T00:00:00Z" }), "compro");
  assert.equal(estadoEspera({ purchased_at: "x", unsubscribed_at: "y" }), "baja");
  assert.equal(fechaCdmx("2026-10-26T15:14:00Z"), "26 oct 2026 · 09:14");
  assert.equal(fechaCdmx(null), "");
});

test("comunidad: CSV con BOM, comillas y sin fórmulas", () => {
  const csv = toCsv(["Correo", "Nota"], [["=HYPERLINK(\"x\")@a.mx", 'dijo "hola", ok'], ["ana@b.mx", true]]);
  assert.ok(csv.startsWith("﻿"));
  const lines = csv.slice(1).trim().split("\r\n");
  assert.equal(lines[1], `"'=HYPERLINK(""x"")@a.mx","dijo ""hola"", ok"`);
  assert.equal(lines[2], "ana@b.mx,Sí");
});
