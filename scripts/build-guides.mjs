// Genera los PDF de las guías descargables con la plantilla de marca (scripts/guias/guia.css).
// Fuente: content/blog/guias/<slug>.md (datos al inicio + secciones en Markdown). Salida: public/guias/<slug>.pdf.
// Uso: npm run guides:build            (todas)
//      npm run guides:build -- <slug>  (una)
// Necesita Chrome o Chromium. Busca, en orden: CHROME_PATH, /opt/pw-browsers/chromium y el Chrome instalado.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { Marked } from "marked";
import { chromium } from "playwright-core";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "content/blog/guias");
const OUT = join(ROOT, "public/guias");
const TMP = join(ROOT, "node_modules/.cache/guias");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const md = new Marked({ gfm: true });
const inline = (s) => md.parseInline(s);

function fail(file, msg) {
  console.error(`content/blog/guias/${file}: ${msg}`);
  process.exit(1);
}

function read(file) {
  const { data, content } = matter(readFileSync(join(SRC, file), "utf8"));
  const req = ["titulo", "numero", "categoria", "entradilla", "fecha"];
  for (const k of req) if (!data[k]) fail(file, `falta "${k}"`);
  const fecha = data.fecha instanceof Date ? data.fecha.toISOString().slice(0, 10) : String(data.fecha);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) fail(file, "la fecha va como AAAA-MM-DD");
  const resumen = data.resumen ?? [];
  if (!Array.isArray(resumen) || resumen.length < 2 || resumen.length > 3) fail(file, '"resumen" lleva 2 o 3 frases');
  return { slug: file.replace(/\.md$/, ""), ...data, fecha, resumen, numero: String(data.numero), content };
}

// Cada título ## abre una sección numerada; una sección con tabla ocupa todo el ancho.
// Una cita (>) fuera de las secciones queda como consejo destacado a todo el ancho.
function body(content) {
  const out = [];
  let section = null;
  const close = () => {
    if (!section) return;
    const wide = section.tokens.some((t) => t.type === "table");
    out.push(
      `<section class="section${wide ? " ancha" : ""}"><p class="num mono">${String(section.n).padStart(2, "0")}</p>` +
        `<h2>${inline(section.title)}</h2>${md.parser(section.tokens)}</section>`,
    );
    section = null;
  };
  let n = 0;
  for (const t of md.lexer(content)) {
    if (t.type === "heading" && t.depth === 2) {
      close();
      section = { n: ++n, title: t.text, tokens: [] };
    } else if (t.type === "blockquote") {
      close();
      out.push(md.parser([t]));
    } else if (t.type !== "space") {
      if (!section) out.push(md.parser([t]));
      else section.tokens.push(t);
    }
  }
  close();
  // Cifra con unidad en tablas: celdas cortas que empiezan con número, como "6 a 8 °C".
  return out.join("\n").replace(/<td>(\d[^<]{0,13})<\/td>/g, '<td class="dato">$1</td>');
}

function html(g) {
  const [y, m] = g.fecha.split("-");
  const css = readFileSync(join(ROOT, "scripts/guias/guia.css"), "utf8").replaceAll(
    "{{fonts}}",
    pathToFileURL(join(ROOT, "node_modules/@fontsource")).href,
  );
  const logo = pathToFileURL(join(ROOT, "public/brand/logo-color.svg")).href;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(g.titulo)} · Viviendo Vino</title><style>${css}</style></head>
<body><div class="page" style="--n:${g.resumen.length}">
<header class="head">
  <img class="logo" src="${logo}" alt="Viviendo Vino">
  <div class="meta mono"><span>Guía n.º ${esc(g.numero)} · ${MESES[Number(m) - 1]} ${y}</span>${g.ejemplo ? '<span class="ejemplo">Ejemplo</span>' : ""}</div>
</header>
<div class="hero">
  <div class="ghost" aria-hidden="true">${esc(g.numero)}</div>
  <p class="label mono">${esc(g.categoria)}</p>
  <h1>${esc(g.titulo)}</h1>
  <p class="lede">${inline(g.entradilla)}</p>
</div>
<div class="resumen">
  <p class="mono">En pocas palabras</p>
  <ol>${g.resumen.map((r, i) => `<li><span class="mono">${String(i + 1).padStart(2, "0")}</span>${inline(r)}</li>`).join("")}</ol>
</div>
<main class="body">${body(g.content)}</main>
<footer class="foot mono"><span class="sitio">viviendovino.com</span><span>Evita el exceso · Venta solo a mayores de 18 años</span></footer>
</div></body></html>`;
}

function browserOptions() {
  const path = process.env.CHROME_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null);
  return path ? { executablePath: path } : { channel: "chrome" };
}

const only = process.argv[2];
const files = readdirSync(SRC).filter((f) => f.endsWith(".md") && !f.startsWith("_") && (!only || f === `${only}.md`));
if (only && files.length === 0) fail(`${only}.md`, "no existe");

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
const browser = await chromium.launch(browserOptions());
const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
for (const file of files) {
  const g = read(file);
  const tmp = join(TMP, `${g.slug}.html`);
  writeFileSync(tmp, html(g));
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  // La guía es de una sola página: si el contenido no cabe, se avisa en lugar de cortarlo.
  const overflow = await page.evaluate(() => {
    const p = document.querySelector(".page");
    return p.scrollHeight > p.clientHeight;
  });
  if (overflow) fail(file, "el contenido no cabe en una página carta; recorta texto o quita una sección");
  await page.pdf({ path: join(OUT, `${g.slug}.pdf`), format: "Letter", printBackground: true, pageRanges: "1" });
  if (process.env.GUIDE_PREVIEW) await page.screenshot({ path: join(process.env.GUIDE_PREVIEW, `${g.slug}.png`) });
  console.log(`public/guias/${g.slug}.pdf`);
}
await browser.close();
