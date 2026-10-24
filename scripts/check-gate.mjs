// Prueba de punta a punta del interruptor contra un servidor en marcha.
// Uso: BASE=http://localhost:3000 MODE=production|preview [HOST=dev.viviendovino.com] [PASSWORD=...] node scripts/check-gate.mjs
// MODE=production: tienda cerrada; ninguna ruta de la tienda responde 200 y la lista de espera funciona.
// MODE=preview: sin cookie todo pide contraseña; con contraseña se ve la tienda; noindex en todo.

const BASE = process.env.BASE ?? "http://localhost:3000";
const MODE = process.env.MODE ?? "production";
const HOST = process.env.HOST;
const PASSWORD = process.env.PASSWORD ?? "";

const STORE = ["/inicio", "/vinos", "/vinos/chardonnay-vento-igt-2024", "/arma-tu-kit", "/carrito", "/checkout", "/envios",
  "/preguntas-frecuentes", "/terminos", "/privacidad", "/componentes", "/quiz", "/wine-scan", "/nosotros", "/blog", "/blog/como-leer-la-etiqueta-de-un-vino", "/guias/temperatura-de-servicio.pdf", "/api/tienda/estado", "/api/carrito/validar", "/api/checkout/revisar", "/acceso", "/api/acceso"];

let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
  if (!ok) failed++;
};
const get = (path, init = {}) =>
  fetch(BASE + path, { redirect: "manual", ...init, headers: { ...(HOST ? { host: HOST } : {}), ...(init.headers ?? {}) } });

// Quita identificadores que cambian en cada respuesta para poder comparar dos páginas 404.
const normalize = (html) => html.replace(/[A-Za-z0-9_-]{20,}/g, "");

if (MODE === "production") {
  // Referencia: el 404 de una ruta que nunca existió.
  const reference = normalize(await (await get("/zz-ruta-que-no-existe")).text());
  for (const path of STORE) {
    const res = await get(path, path === "/api/acceso" ? { method: "POST" } : {});
    const body = normalize(await res.text());
    check(res.status === 404 && (path === "/api/acceso" || body === reference), `${path} → ${res.status}, idéntico a un 404 cualquiera`);
  }
  const home = await get("/");
  check(home.status === 200 && (await home.text()).includes("Quiero mi regalo sorpresa"), "/ → lista de espera");
  const robots = await (await get("/robots.txt")).text();
  check(/Disallow: \/\n/.test(robots) && !/vinos|carrito|checkout|inicio/.test(robots), "robots.txt bloquea sin nombrar rutas");
  const sitemap = await (await get("/sitemap.xml")).text();
  check(!/vinos|carrito|checkout|inicio/.test(sitemap), "sitemap.xml sin rutas de la tienda");
  const api = await get("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check(api.status === 400, `/api/waitlist sigue respondiendo (${api.status})`);
} else {
  for (const path of ["/", "/vinos", "/inicio"]) {
    const res = await get(path);
    check(res.status === 303 && (res.headers.get("location") ?? "").includes("/acceso"), `${path} sin cookie → acceso`);
    check((res.headers.get("x-robots-tag") ?? "").includes("noindex"), `${path} con X-Robots-Tag noindex`);
  }
  const api = await get("/api/tienda/estado");
  check(api.status === 401, `/api/tienda/estado sin cookie → ${api.status}`);
  const login = await get("/acceso");
  const html = await login.text();
  check(login.status === 200 && html.includes('name="robots" content="noindex'), "/acceso → 200 con meta noindex");
  const robots = await (await get("/robots.txt")).text();
  check(/Disallow: \/\s*$/m.test(robots) && !/Allow: \/\$/.test(robots), "robots.txt: Disallow total");

  const bad = await get("/api/acceso", { method: "POST", body: new URLSearchParams({ password: "mala", next: "/vinos" }) });
  check(bad.status === 303 && (bad.headers.get("location") ?? "").includes("error=clave"), "contraseña incorrecta → error");
  const good = await get("/api/acceso", { method: "POST", body: new URLSearchParams({ password: PASSWORD, next: "/vinos" }) });
  const cookie = (good.headers.get("set-cookie") ?? "").split(";")[0];
  const setCookie = good.headers.get("set-cookie") ?? "";
  check(good.status === 303 && /HttpOnly/i.test(setCookie) && /Max-Age=604800/.test(setCookie), "contraseña correcta → cookie httpOnly de 7 días");
  check((good.headers.get("location") ?? "").endsWith("/vinos"), "regresa a la ruta pedida");
  const store = await get("/", { headers: { cookie } });
  check(store.status === 200 && (await store.text()).includes("Arma tu kit"), "/ con cookie → portada de la tienda");
  const waitlist = await get("/api/waitlist", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}" });
  check(waitlist.status === 400, "/api/waitlist sigue funcionando con cookie");
  const forged = await get("/vinos", { headers: { cookie: "vv_preview=9999999999999.falsa" } });
  check(forged.status === 303, "cookie falsificada → acceso");
}

console.log(failed ? `\n${failed} fallaron` : "\nTodo bien");
process.exit(failed ? 1 : 0);
