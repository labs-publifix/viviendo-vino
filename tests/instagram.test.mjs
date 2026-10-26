// Feed de Instagram (Behold): solo imágenes estables de "sizes", alt desde prunedCaption y orden del feed. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { FEED_ALT_FALLBACK, altFromCaption, parseFeed } from "../lib/instagram-feed.ts";

const img = (n, s) => `https://hop.behold.pictures/abc/${n}-${s}.webp`;
const post = (n, extra = {}) => ({
  id: `p${n}`,
  timestamp: "2026-10-20T18:00:00+0000",
  permalink: `https://www.instagram.com/reel/${n}/`,
  mediaType: "VIDEO",
  mediaUrl: `https://scontent.cdninstagram.com/v/${n}.mp4?oe=firmado`,
  thumbnailUrl: `https://scontent.cdninstagram.com/v/${n}.jpg?oe=firmado`,
  caption: "Un tinto para el fin de semana #vino #viviendovino",
  prunedCaption: "Un tinto para el fin de semana",
  sizes: { small: { mediaUrl: img(n, "s") }, medium: { mediaUrl: img(n, "m") }, large: { mediaUrl: img(n, "l") }, full: { mediaUrl: img(n, "f") } },
  ...extra,
});

test("usa sizes (nunca el .mp4 ni los enlaces firmados) y respeta el orden", () => {
  const out = parseFeed({ username: "viviendovino", posts: [post(1), post(2, { mediaType: "IMAGE" }), post(3)] });
  assert.deepEqual(out.map((p) => p.id), ["p1", "p2", "p3"]);
  assert.deepEqual(out[0].images, { small: img(1, "s"), medium: img(1, "m"), large: img(1, "l") });
  assert.equal(out[0].isVideo, true);
  assert.equal(out[1].isVideo, false);
  for (const p of out) assert.ok(!JSON.stringify(p).includes("cdninstagram"));
});

test("máximo 6 publicaciones", () => {
  assert.equal(parseFeed({ posts: Array.from({ length: 9 }, (_, i) => post(i)) }).length, 6);
});

test("descarta publicaciones sin imagen de Behold o con enlaces de otros dominios", () => {
  const malas = [
    post(1, { sizes: {} }),
    post(2, { sizes: { medium: { mediaUrl: "https://evil.example.com/x.webp" } } }),
    post(3, { permalink: "javascript:alert(1)" }),
    post(4, { permalink: "https://evil.example.com/p/4" }),
  ];
  assert.deepEqual(parseFeed({ posts: [...malas, post(5)] }).map((p) => p.id), ["p5"]);
});

test("feed vacío o malformado: lista vacía (la página muestra los cuadros de espera)", () => {
  assert.deepEqual(parseFeed(null), []);
  assert.deepEqual(parseFeed({}), []);
  assert.deepEqual(parseFeed({ posts: "no" }), []);
  assert.deepEqual(parseFeed({ posts: [] }), []);
});

test("alt: primeras 10 palabras de prunedCaption o el texto de respaldo", () => {
  assert.equal(altFromCaption("Un tinto para el fin de semana"), "Un tinto para el fin de semana");
  assert.equal(altFromCaption("uno dos tres cuatro cinco seis siete ocho nueve diez once doce"), "uno dos tres cuatro cinco seis siete ocho nueve diez…");
  assert.equal(altFromCaption(""), FEED_ALT_FALLBACK);
  assert.equal(altFromCaption(undefined), FEED_ALT_FALLBACK);
  assert.equal(parseFeed({ posts: [post(1, { prunedCaption: "" })] })[0].alt, FEED_ALT_FALLBACK);
});

test("acepta otros subdominios de Behold e Instagram, nunca el CDN firmado", async () => {
  const otro = post(1, { permalink: "https://instagram.com/p/1/", sizes: { medium: { mediaUrl: "https://cdn2.behold.pictures/x/1.webp" } } });
  const cdn = post(2, { sizes: { medium: { mediaUrl: "https://scontent.cdninstagram.com/v/2.jpg?oe=firmado" } } });
  assert.deepEqual(parseFeed({ posts: [otro, cdn] }).map((p) => p.id), ["p1"]);
  const { describeFeed } = await import("../lib/instagram-feed.ts");
  assert.match(describeFeed({ posts: [cdn] }), /1 publicaciones; primera: sizes=\[medium\], medium=scontent.cdninstagram.com/);
  assert.match(describeFeed({ data: [] }), /sin arreglo "posts" \(claves: data\)/);
});
