// Optimiza las fotos originales de fotos-vinos/ para la tienda: public/img/vinos/<slug>.webp (3:4, ~880×1184).
// Uso: npm run photos:build. Después: npm run seed:build para que el catálogo apunte a las fotos.
// El mapa liga cada archivo original con el slug del vino (la fuente de los slugs es scripts/build-seed.mjs).

import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "fotos-vinos");
const OUT = join(root, "public/img/vinos");

const MAP = {
  "levorato-chardonnay-veneto": "chardonnay-vento-igt-2024",
  "levorato-sauvignon-blanc": "sauvignon-blanc-trevenezie-igt-2024",
  "levorato-pinot-grigio": "pinot-grigio-delle-venezie-doc-2024",
  "levorato-traminer-aromatico": "traminer-aromatico-trevenezie-igt-2025",
  "levorato-falanghina-puglia": "falanghina-puglia-igt",
  "levorato-soave": "soave-doc-2024",
  "levorato-pinot-grigio-rose": "pinot-grigio-delle-venezie-doc-blush-rosado-2025",
  "levorato-cabernet-sauvignon": "cabernet-sauvignon-veneto-igt-2024",
  "levorato-merlot": "merlot-veneto-igt-2024",
  "levorato-montepulciano-d-abruzzo": "montepulciano-d-abruzzo-doc-2024",
  "fiorella-bertino": "langhe-nebbiolo",
  "levorato-don-carlo-veneto": "don-carlo-rosso-veneto-igt-2018",
  "primitivo-di-manduria-villa-fulvia": "primitivo-di-manduria-doc-2023",
  "levorato-valpolicella-ripasso": "valpolicella-ripasso-classico-superiore-doc-2020",
  "levorato-amarone-della-valpolicella": "amarone-della-valpolicella-classico-docg-2017",
  "rocca-sangiovese-primitivo": "sangiovese-puglia-igt-2024-double-gold",
  "rocca-primitivo": "primitivo-2025-double-gold",
  "carlosV-prosecco": "prosecco-doc-spumante-brut-imperial",
  "collevento-rose": "rose-extra-dry-921",
};

mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const unknown = [];
for (const file of files) {
  const base = file.replace(/\.[^.]+$/, "");
  const slug = MAP[base] ?? (Object.values(MAP).includes(base) ? base : null);
  if (!slug) {
    unknown.push(file);
    continue;
  }
  await sharp(join(SRC, file))
    .resize(880, 1184, { fit: "cover", position: "centre" })
    .webp({ quality: 80 })
    .toFile(join(OUT, `${slug}.webp`));
  console.log(`${file} → public/img/vinos/${slug}.webp`);
}
const done = new Set(readdirSync(OUT).map((f) => f.replace(/\.webp$/, "")));
const missing = Object.values(MAP).filter((s) => !done.has(s));
if (missing.length) console.log(`Sin foto: ${missing.join(", ")}`);
if (unknown.length) console.log(`Archivos sin vino asignado (agrégalos al mapa): ${unknown.join(", ")}`);
