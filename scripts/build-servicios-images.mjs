// Imágenes del hero de las páginas de servicios (fotos-vinos/servicios/*.png, 2720 × 1536).
// - Escritorio y tableta: horizontal 16:9 en 960, 1440, 1920 y 2560 px (AVIF y WebP).
// - Móvil: recorte vertical 3:4 con el sujeto al centro (focoX), en 480, 720 y 960 px.
// - Open Graph: 1200 × 630 en JPEG.
// Uso: node scripts/build-servicios-images.mjs

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// focoX: centro horizontal del sujeto (0 a 1), medido en cada foto.
export const SERVICIOS = {
  "marketing-para-negocios-de-vino": { focoX: 0.635 },
  "experiencias-con-ia": { focoX: 0.6 },
  "consultoria-para-centros-de-consumo": { focoX: 0.63 },
  "regalos-corporativos": { focoX: 0.6 },
};

for (const [slug, { focoX }] of Object.entries(SERVICIOS)) {
  const src = join(root, "fotos-vinos/servicios", `${slug}.png`);
  const dir = join(root, "public/img/servicios", slug);
  mkdirSync(dir, { recursive: true });
  const { width: W, height: H } = await sharp(src).metadata();

  for (const w of [960, 1440, 1920, 2560]) {
    const base = sharp(src).resize(w, Math.round((w * 9) / 16), { fit: "cover" });
    await base.clone().avif({ quality: 50 }).toFile(join(dir, `ancho-${w}.avif`));
    await base.clone().webp({ quality: 78 }).toFile(join(dir, `ancho-${w}.webp`));
  }

  const cw = Math.round((H * 3) / 4);
  const left = Math.max(0, Math.min(W - cw, Math.round(focoX * W - cw / 2)));
  for (const w of [480, 720, 960]) {
    const base = sharp(src).extract({ left, top: 0, width: cw, height: H }).resize(w, Math.round((w * 4) / 3));
    await base.clone().avif({ quality: 50 }).toFile(join(dir, `alto-${w}.avif`));
    await base.clone().webp({ quality: 78 }).toFile(join(dir, `alto-${w}.webp`));
  }

  await sharp(src).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(dir, "og.jpg"));
  console.log(`${slug} → public/img/servicios/${slug}/`);
}
