// Pruebas del interruptor de apertura y del acceso al preview: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, isWaitlistPath, safeNext } from "../lib/gate.ts";
import { createPreviewCookieValue, passwordMatches, verifyPreviewCookie } from "../lib/preview-access.ts";

const PROD_CLOSED = { storeOpen: false, preview: false, vercelEnv: "production" };
const PROD_OPEN = { storeOpen: true, preview: false, vercelEnv: "production" };
const PREVIEW = { storeOpen: true, preview: true, vercelEnv: "preview" };
const WWW = "www.viviendovino.com";
const DEV = "dev.viviendovino.com";

const STORE_ROUTES = [
  "/inicio", "/vinos", "/vinos/chardonnay-vento", "/arma-tu-kit", "/carrito", "/checkout",
  "/envios", "/preguntas-frecuentes", "/terminos", "/privacidad", "/componentes",
  "/api/tienda/estado", "/api/tienda/carrito", "/api/kits/validar", "/acceso", "/api/acceso",
];
const WAITLIST_ROUTES = [
  "/", "/baja", "/correos", "/api/waitlist", "/api/waitlist/unsubscribe", "/api/cron/email-sequence",
  "/robots.txt", "/sitemap.xml", "/brand/logo-color.svg", "/email/logo-viviendo-vino.png", "/icon.png",
];

test("producción cerrada: ninguna ruta de la tienda pasa", () => {
  for (const pathname of STORE_ROUTES) {
    assert.deepEqual(decide({ pathname, host: WWW, env: PROD_CLOSED, hasPreviewAccess: false }), { action: "not-found" }, pathname);
  }
});

test("producción cerrada: la lista de espera funciona igual", () => {
  for (const pathname of WAITLIST_ROUTES) {
    assert.deepEqual(decide({ pathname, host: WWW, env: PROD_CLOSED, hasPreviewAccess: false }), { action: "next" }, pathname);
  }
});

test("una ruta nueva cualquiera queda oculta por defecto", () => {
  assert.equal(isWaitlistPath("/kits-prearmados"), false);
  assert.deepEqual(decide({ pathname: "/kits-prearmados", host: WWW, env: PROD_CLOSED, hasPreviewAccess: false }), { action: "not-found" });
});

test("STORE_OPEN sin definir equivale a cerrada", () => {
  const env = { storeOpen: process.env.__NO_EXISTE__ === "true", preview: false, vercelEnv: "production" };
  assert.deepEqual(decide({ pathname: "/vinos", host: WWW, env, hasPreviewAccess: false }), { action: "not-found" });
});

test("dev.* nunca sirve el despliegue de producción", () => {
  for (const pathname of ["/", "/vinos", "/acceso"]) {
    assert.deepEqual(decide({ pathname, host: DEV, env: PROD_OPEN, hasPreviewAccess: true }), { action: "not-found" });
    assert.deepEqual(decide({ pathname, host: DEV, env: PROD_CLOSED, hasPreviewAccess: true }), { action: "not-found" });
  }
});

test("preview sin contraseña: todo pide acceso, nada de la tienda se muestra", () => {
  for (const pathname of ["/", ...STORE_ROUTES.filter((p) => p !== "/acceso" && p !== "/api/acceso"), "/api/waitlist"]) {
    assert.deepEqual(decide({ pathname, host: DEV, env: PREVIEW, hasPreviewAccess: false }), { action: "login" }, pathname);
  }
  assert.deepEqual(decide({ pathname: "/acceso", host: DEV, env: PREVIEW, hasPreviewAccess: false }), { action: "next" });
  assert.deepEqual(decide({ pathname: "/brand/logo-color.svg", host: DEV, env: PREVIEW, hasPreviewAccess: false }), { action: "next" });
});

test("preview en *.vercel.app también pide contraseña", () => {
  const host = "viviendo-vino-git-develop-viviendo-vino.vercel.app";
  assert.deepEqual(decide({ pathname: "/vinos", host, env: PREVIEW, hasPreviewAccess: false }), { action: "login" });
});

test("preview con contraseña: la portada es la tienda", () => {
  assert.deepEqual(decide({ pathname: "/", host: DEV, env: PREVIEW, hasPreviewAccess: true }), { action: "rewrite", to: "/inicio" });
  assert.deepEqual(decide({ pathname: "/vinos", host: DEV, env: PREVIEW, hasPreviewAccess: true }), { action: "next" });
  assert.deepEqual(decide({ pathname: "/inicio", host: DEV, env: PREVIEW, hasPreviewAccess: true }), { action: "redirect", to: "/" });
});

test("tienda abierta en producción: portada de la tienda y sin pantalla de acceso", () => {
  assert.deepEqual(decide({ pathname: "/", host: WWW, env: PROD_OPEN, hasPreviewAccess: false }), { action: "rewrite", to: "/inicio" });
  assert.deepEqual(decide({ pathname: "/vinos", host: WWW, env: PROD_OPEN, hasPreviewAccess: false }), { action: "next" });
  assert.deepEqual(decide({ pathname: "/acceso", host: WWW, env: PROD_OPEN, hasPreviewAccess: false }), { action: "not-found" });
});

test("cookie de acceso: válida, vencida, alterada y con otra contraseña", () => {
  const now = Date.parse("2026-10-21T12:00:00Z");
  const value = createPreviewCookieValue("copa-tinto", now);
  assert.equal(verifyPreviewCookie(value, "copa-tinto", now + 1000), true);
  assert.equal(verifyPreviewCookie(value, "copa-tinto", now + 8 * 24 * 3600 * 1000), false);
  assert.equal(verifyPreviewCookie(value.slice(0, -1) + "x", "copa-tinto", now), false);
  assert.equal(verifyPreviewCookie(value, "otra", now), false);
  assert.equal(verifyPreviewCookie(value, undefined, now), false);
  assert.equal(verifyPreviewCookie(undefined, "copa-tinto", now), false);
});

test("contraseña y destino seguro", () => {
  assert.equal(passwordMatches("copa-tinto", "copa-tinto"), true);
  assert.equal(passwordMatches("copa", "copa-tinto"), false);
  assert.equal(passwordMatches("x", undefined), false);
  assert.equal(safeNext("/vinos?x=1"), "/vinos?x=1");
  assert.equal(safeNext("//evil.com"), "/");
  assert.equal(safeNext("https://evil.com"), "/");
  assert.equal(safeNext(null), "/");
});
