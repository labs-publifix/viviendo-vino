// Recortes para las imágenes de compartir (Open Graph, 1200 × 630): la foto del lado derecho de cada sección,
// la botella de cada vino y el logo en PNG (Satori no lee WebP). Salen en public/img/og/ y los usan los
// opengraph-image.tsx de cada sección (lib/og/plantilla.tsx).
//
//   node scripts/build-og-images.mjs
//
// Vuelve a correrlo si cambia una foto de sección o se agrega la foto de un vino nuevo.
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUT = "public/img/og";
const FOTO = { width: 540, height: 630 }; // lado derecho de la plantilla
const BOTELLA = { width: 480, height: 630 };

// Sección → foto original y punto de recorte.
const SECCIONES = {
  inicio: { src: "public/img/hero-rafa.webp", position: "top" },
  vinos: { src: "public/img/kits/blancos-frescos.webp", position: "centre" },
  "arma-tu-kit": { src: "public/img/kits/tintos-de-diario.webp", position: "centre" },
  "wine-scan": { src: "public/img/wine-scan/hero-688.webp", position: "centre" },
  nosotros: { src: "public/img/rafa.webp", position: "centre" },
};

await mkdir(join(OUT, "vinos"), { recursive: true });

for (const [clave, { src, position }] of Object.entries(SECCIONES)) {
  await sharp(src).resize({ ...FOTO, fit: "cover", position }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(OUT, `${clave}.jpg`));
  console.log(`${clave} → ${OUT}/${clave}.jpg`);
}

// Botellas: la foto ya viene centrada sobre fondo claro; se recorta a lo alto sin deformar.
for (const file of (await readdir("public/img/vinos")).filter((f) => f.endsWith(".webp"))) {
  const slug = file.replace(/\.webp$/, "");
  await sharp(join("public/img/vinos", file)).resize({ ...BOTELLA, fit: "cover", position: "centre" }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(OUT, "vinos", `${slug}.jpg`));
}
console.log(`botellas → ${OUT}/vinos/`);

// Logo en PNG (a doble resolución) para fondo claro y para fondo oscuro.
for (const [src, nombre] of [
  ["public/brand/logo-color.svg", "logo-color.png"],
  ["public/brand/logo-fondo-oscuro.svg", "logo-claro.png"],
]) {
  await sharp(src, { density: 300 }).resize({ height: 140 }).png().toFile(join(OUT, nombre));
}
console.log(`logos → ${OUT}/`);
