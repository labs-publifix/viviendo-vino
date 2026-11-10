// Páginas de servicios: reglas de enlaces y rutas. `npm test`.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { ENLACE, SERVICIOS } from "../lib/servicios/contenido.ts";

/** Todos los textos de una página, en el orden en que aparecen. */
function textos(s) {
  const out = [s.hero.titulo, s.hero.subtitulo, s.cierre.titulo, s.cierre.texto];
  for (const sec of s.secciones) {
    if (sec.tipo === "intro") out.push(sec.texto);
    if (sec.tipo === "ejemplos") out.push(sec.texto, ...sec.ejemplos.flatMap((e) => [e.titulo, e.texto]));
    if (sec.tipo === "servicios") out.push(sec.texto ?? "", ...sec.grupos.flatMap((g) => [g.titulo ?? "", g.texto ?? "", ...g.tarjetas.flatMap((t) => [t.titulo, t.texto])]));
    if (sec.tipo === "pasos") out.push(...sec.pasos.flatMap((p) => [p.titulo, p.texto]));
    if (sec.tipo === "respaldo") out.push(sec.titulo, ...sec.parrafos);
  }
  return out;
}
const sinEnlaces = (t) => t.replace(/\[[^\]\n]+\]\([^)\n]+\)/g, "");

test("cada mención de Continental Media enlaza a continentalmedia.com.mx", () => {
  let total = 0;
  for (const s of SERVICIOS) {
    for (const t of textos(s)) {
      total += (t.match(/\[Continental Media\]\(https:\/\/continentalmedia\.com\.mx\)/g) ?? []).length;
      assert.ok(!sinEnlaces(t).includes("Continental Media"), `${s.slug}: "Continental Media" sin enlace en: ${t.slice(0, 60)}`);
    }
  }
  assert.equal(total, 4);
});

test("Publifix: Suite → launch.publifix.net; con agentes de IA → agents.publifix.net; nunca publifix.net a secas", () => {
  for (const s of SERVICIOS) {
    for (const t of textos(s)) {
      assert.ok(!sinEnlaces(t).includes("Publifix"), `${s.slug}: "Publifix" sin enlace`);
      assert.ok(!/\(https?:\/\/(www\.)?publifix\.net/.test(t), `${s.slug}: enlace a publifix.net`);
      for (const m of t.matchAll(/\[([^\]]*Publifix[^\]]*)\]\(([^)]+)\)/g)) {
        const agentes = /agentes/i.test(t);
        assert.equal(m[2], agentes ? ENLACE.publifixAgentes : ENLACE.publifixSuite, `${s.slug}: ${m[1]}`);
      }
    }
  }
  const mk = textos(SERVICIOS.find((s) => s.slug === "marketing-para-negocios-de-vino")).join(" ");
  const ia = textos(SERVICIOS.find((s) => s.slug === "experiencias-con-ia")).join(" ");
  assert.ok(mk.includes(`[Publifix Suite](${ENLACE.publifixSuite})`));
  assert.ok(ia.includes(`[Publifix](${ENLACE.publifixAgentes})`));
});

test("Experiencias con IA: los ejemplos apuntan a rutas que existen en el proyecto", () => {
  const ia = SERVICIOS.find((s) => s.slug === "experiencias-con-ia");
  const hrefs = ia.secciones.filter((x) => x.tipo === "ejemplos").flatMap((x) => x.ejemplos.map((e) => e.enlace.href));
  assert.deepEqual(hrefs, ["/wine-scan", "/quiz", "/blog"]);
  for (const h of hrefs) assert.ok(existsSync(`app/(tienda)/(sitio)${h}/page.tsx`), h);
});

test("cuatro servicios con ruta limpia, motivo de contacto e imágenes del hero", () => {
  assert.deepEqual(SERVICIOS.map((s) => s.slug), ["marketing-para-negocios-de-vino", "experiencias-con-ia", "consultoria-para-centros-de-consumo", "regalos-corporativos"]);
  for (const s of SERVICIOS) {
    assert.match(s.slug, /^[a-z0-9-]+$/);
    for (const f of ["ancho-1440.webp", "ancho-1440.avif", "alto-720.webp", "og.jpg"]) assert.ok(existsSync(`public/img/servicios/${s.slug}/${f}`), `${s.slug}/${f}`);
    assert.ok(s.hero.alt.length > 30);
    assert.ok(!textos(s).some((t) => /Por confirmar/i.test(t)), `${s.slug}: nota interna publicada`);
  }
});
