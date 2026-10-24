// Contenido del blog (content/blog/*.md): `npm test`.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import matter from "gray-matter";

const dir = new URL("../content/blog/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f === f.toLowerCase());
const slugify = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const catalogo = new Set(
  JSON.parse(readFileSync(new URL("../data/catalogo-inicial.json", import.meta.url), "utf8")).vinos.map((v) => slugify(v.nombre_oficial_excel)),
);
const posts = files.map((f) => ({ file: f, ...matter(readFileSync(new URL(f, dir), "utf8")) }));

test("hay artículos y cada uno trae los campos obligatorios", () => {
  assert.ok(posts.length > 0);
  for (const { file, data } of posts) {
    for (const k of ["titulo", "slug", "extracto", "tipo", "categoria", "color", "fecha", "resumen", "publicado"]) {
      assert.ok(data[k] !== undefined, `${file}: falta ${k}`);
    }
    assert.equal(`${data.slug}.md`, file, `${file}: el slug debe ser el nombre del archivo`);
    assert.match(String(data.fecha instanceof Date ? data.fecha.toISOString().slice(0, 10) : data.fecha), /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(["articulo", "guia"].includes(data.tipo), `${file}: tipo`);
    assert.ok(["oscuro", "claro", "vino", "acento"].includes(data.color), `${file}: color`);
    assert.ok(data.resumen.length >= 1 && data.resumen.length <= 4, `${file}: resumen de 1 a 4 frases`);
  }
});

test("los vinos citados existen en el catálogo", () => {
  for (const { file, data } of posts) for (const v of data.vinos ?? []) assert.ok(catalogo.has(v), `${file}: ${v} no está en el catálogo`);
});

test("las guías usan el color de acento y su PDF existe", () => {
  for (const { file, data } of posts.filter((p) => p.data.tipo === "guia")) {
    assert.equal(data.color, "acento", `${file}: las guías van en acento`);
    assert.ok(data.pdf && existsSync(new URL(`../public${data.pdf}`, import.meta.url)), `${file}: falta el PDF ${data.pdf}`);
  }
});

test("el texto trae títulos de segundo nivel para el índice", () => {
  for (const { file, content } of posts) assert.ok(/^## /m.test(content), `${file}: sin títulos ##`);
});
