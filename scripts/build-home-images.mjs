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
// Foto final de Nosotros (25 oct 2026), vertical 768×1024. El avatar del blog sigue saliendo de rafa-nosotros.png.
await sharp(join(root, "fotos-vinos/rafa-nosotros-final.png")).webp({ quality: 82 }).toFile(join(out(""), "rafa.webp"));
console.log("Rafa → public/img/rafa.webp");

// Avatar de Rafa (blog): recorte cuadrado de su rostro desde la misma foto.
await sharp(join(root, "fotos-vinos/rafa-nosotros.png"))
  .extract({ left: 320, top: 30, width: 340, height: 340 })
  .resize(192, 192)
  .webp({ quality: 85 })
  .toFile(join(out(""), "rafa-avatar.webp"));
console.log("avatar → public/img/rafa-avatar.webp");
// Copia en PNG para las imágenes para compartir (next/og no lee WebP).
await sharp(join(root, "fotos-vinos/rafa-nosotros.png"))
  .extract({ left: 320, top: 30, width: 340, height: 340 })
  .resize(192, 192)
  .png()
  .toFile(join(out(""), "rafa-avatar.png"));
console.log("avatar PNG → public/img/rafa-avatar.png");

// Hero de Wine Scan (solo escritorio): ilustración 16:9 (1600 × 900). Un recorte 4:5 de alto completo (720 px de
// ancho) siempre corta el rostro de una de las dos mujeres de las orillas; este (688 × 860 desde x = 566) deja completos
// al hombre de atrás, la mujer con el teléfono y el hombre con la botella, sin rostros cortados.
const WINE_SCAN = join(root, "fotos-vinos/wine-scan-ilustration.jpg");
for (const w of [432, 576, 688]) {
  const base = sharp(WINE_SCAN).extract({ left: 566, top: 0, width: 688, height: 860 }).resize(w, Math.round((w * 5) / 4));
  await base.clone().avif({ quality: 55 }).toFile(join(out("wine-scan"), `hero-${w}.avif`));
  await base.clone().webp({ quality: 80 }).toFile(join(out("wine-scan"), `hero-${w}.webp`));
}
console.log("hero de Wine Scan → public/img/wine-scan/hero-{432,576,688}.{avif,webp}");

// Logos de tarjetas del pie: sin el margen vacío de los originales, a 64 px de alto (2x de lo que se muestra).
for (const [file, name] of [["VISA-Logo.png", "visa"], ["Mastercard-logo.png", "mastercard"], ["American-Express-Logo.png", "amex"]]) {
  const trimmed = await sharp(join(root, "fotos-vinos", file)).trim({ threshold: 10 }).toBuffer();
  await sharp(trimmed).resize({ height: 64 }).png({ compressionLevel: 9, palette: true }).toFile(join(out("pagos"), `${name}.png`));
}
console.log("tarjetas → public/img/pagos/{visa,mastercard,amex}.png");

// Landing de la lista de espera (producción con la tienda cerrada): sus imágenes viven en public/img/lista/, la única
// carpeta de imágenes que el gate deja pasar antes de la apertura.
await sharp(join(root, "fotos-vinos/descorchador-viviendo-vino.jpg")).resize(900, 900).webp({ quality: 82 }).toFile(join(out("lista"), "descorchador.webp"));
console.log("lista de espera → public/img/lista/descorchador.webp");
