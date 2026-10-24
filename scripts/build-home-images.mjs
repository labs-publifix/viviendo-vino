// Imágenes de la portada a partir de las fotos de fotos-vinos/ (mismo fondo y luz en todas):
// - Kits prearmados: recorte 4:3 de las fotos de kit → public/img/kits/<slug>.webp
// - Grupos de botella: composición 16:10 con botellas reales del grupo → public/img/grupos/<codigo>.webp
// - Hero de la portada: fotos-vinos/hero-rafa-movil.jpg → public/img/hero-rafa.webp
// Uso: npm run home-images:build

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (name) => join(root, "fotos-vinos", `${name}.png`);
const out = (dir) => {
  const path = join(root, "public/img", dir);
  mkdirSync(path, { recursive: true });
  return path;
};

// Fotos originales: 880 × 1184; en las de kit las botellas ocupan del y≈340 al y≈870.
const KITS = {
  "blancos-frescos": "kit-blancos-frescos",
  "tintos-de-diario": "kit-tintos-de-diario",
  burbujas: "kit-burbujas",
};

// Botellas por grupo (archivo original). El azul muestra la mezcla: blanco, rosado y tintos.
const GROUPS = {
  azul: ["levorato-soave", "levorato-pinot-grigio-rose", "levorato-merlot", "fiorella-bertino"],
  rojo: ["levorato-don-carlo-veneto", "primitivo-di-manduria-villa-fulvia", "levorato-valpolicella-ripasso", "levorato-amarone-della-valpolicella"],
  verde: ["rocca-sangiovese-primitivo", "rocca-primitivo"],
  amarillo: ["carlosV-prosecco", "collevento-rose"],
};

const PHOTO_H = 1184;
const STRIP_W = 340; // franja alrededor de la botella (la botella mide ~260 px de ancho)
const CANVAS_W = 1600;
const SCALE = 0.85;

/** Centro horizontal de la botella: promedio de los píxeles oscuros (cápsula y etiqueta). */
async function bottleCenter(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let y = 0; y < info.height; y += 4) {
    for (let x = 0; x < info.width; x += 4) {
      if (data[y * info.width + x] < 110) {
        sum += x;
        n++;
      }
    }
  }
  return n ? Math.round(sum / n) : Math.round(info.width / 2);
}

/** Máscara con bordes difuminados para que las franjas se fundan con el fondo. */
function featherMask(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset="0.35" stop-color="#fff" stop-opacity="1"/>
        <stop offset="0.65" stop-color="#fff" stop-opacity="1"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`,
  );
}

async function groupImage(code, files) {
  const spacing = 300;
  const stripW = Math.round(STRIP_W * SCALE);
  const stripH = Math.round(PHOTO_H * SCALE);
  const top = 0;
  // Fondo: una franja junto a la botella (misma luz) a la misma escala, para que la línea del piso
  // coincida. El lienzo mide lo mismo que las franjas: 1600 × ~1006, casi 16:10.
  const background = await sharp(src(files[0]))
    .extract({ left: 190, top: 0, width: 90, height: PHOTO_H })
    .resize(CANVAS_W, stripH, { fit: "fill" })
    .toBuffer();
  const start = CANVAS_W / 2 - ((files.length - 1) * spacing) / 2;
  const mask = featherMask(stripW, stripH);

  const layers = [];
  for (const [i, name] of files.entries()) {
    const cx = await bottleCenter(src(name));
    const left = Math.max(0, Math.min(880 - STRIP_W, cx - STRIP_W / 2));
    const strip = await sharp(src(name))
      .extract({ left, top: 0, width: STRIP_W, height: PHOTO_H })
      .resize(stripW, stripH)
      .ensureAlpha()
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    layers.push({ input: strip, left: Math.round(start + i * spacing - stripW / 2), top });
  }

  // sharp aplica resize antes que composite: primero se compone, luego se reduce.
  const composed = await sharp(background).composite(layers).png().toBuffer();
  await sharp(composed)
    .resize(1000, 625, { fit: "cover" }) // 16:10
    .webp({ quality: 80 })
    .toFile(join(out("grupos"), `${code}.webp`));
  console.log(`grupo ${code} → public/img/grupos/${code}.webp`);
}

for (const [slug, name] of Object.entries(KITS)) {
  await sharp(src(name))
    .extract({ left: 0, top: 280, width: 880, height: 660 }) // 4:3 centrado en las botellas
    .webp({ quality: 80 })
    .toFile(join(out("kits"), `${slug}.webp`));
  console.log(`kit ${slug} → public/img/kits/${slug}.webp`);
}
for (const [code, files] of Object.entries(GROUPS)) await groupImage(code, files);

// Hero ilustrado: versión limpia en vertical (3:4), sin degradado. Se usa en todos los tamaños.
await sharp(join(root, "fotos-vinos/hero-rafa-movil.jpg")).resize(1086, 1448).webp({ quality: 82 }).toFile(join(out(""), "hero-rafa.webp"));
console.log("hero ilustrado → public/img/hero-rafa.webp");

// Foto de Rafa (Nosotros): cuadrada; cada lugar la encuadra con object-fit.
await sharp(join(root, "fotos-vinos/rafa-nosotros.png")).webp({ quality: 82 }).toFile(join(out(""), "rafa.webp"));
console.log("Rafa → public/img/rafa.webp");
