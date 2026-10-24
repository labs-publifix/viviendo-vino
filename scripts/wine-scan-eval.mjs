// Evaluación de Wine Scan con fotos reales: lee wine-scan/eval-images/, llama al endpoint y resume.
// Uso:
//   npm run wine-scan:eval                                   (contra http://localhost:3000)
//   BASE=https://dev.viviendovino.com PREVIEW_COOKIE=<valor de la cookie vv_preview> npm run wine-scan:eval
// Cada escaneo cuesta tokens de la API de Anthropic. No bloquea la entrega: es una herramienta de revisión.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const DIR = join(ROOT, "wine-scan/eval-images");
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const headers = process.env.PREVIEW_COOKIE ? { cookie: `vv_preview=${process.env.PREVIEW_COOKIE}` } : {};

const files = readdirSync(DIR).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
if (files.length === 0) {
  console.log(`No hay fotos en ${DIR}. Agrega JPG o PNG de etiquetas y vuelve a correr el script.`);
  process.exit(0);
}

const rows = [];
for (const file of files) {
  // Igual que el navegador: lado largo de 1280 px y JPEG 0.8, con la rotación EXIF aplicada.
  const jpeg = await sharp(readFileSync(join(DIR, file))).rotate().resize(1280, 1280, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const form = new FormData();
  form.append("foto", new Blob([jpeg], { type: "image/jpeg" }), "etiqueta.jpg");
  const started = Date.now();
  let row = { foto: file, kb: Math.round(jpeg.length / 1024) };
  try {
    const res = await fetch(`${BASE}/api/wine-scan`, { method: "POST", body: form, headers });
    const data = await res.json();
    row.ms = Date.now() - started;
    if (!data.ok) row = { ...row, accion: `error ${res.status}`, detalle: data.error };
    else {
      const id = data.guia.identificacion;
      row = {
        ...row,
        accion: data.guia.accion,
        vino: [id.productor, id.nombre_vino, id.anada].filter(Boolean).join(" ") || "—",
        grupo: id.grupo,
        confianza: id.confianza,
        recomendacion: data.recomendacion ? `${data.recomendacion.slug} (${data.recomendacion.similitud})` : "—",
      };
    }
  } catch (err) {
    row = { ...row, accion: "sin conexión", detalle: err instanceof Error ? err.message : String(err) };
  }
  rows.push(row);
  console.log(`${file}: ${row.accion} · ${row.vino ?? row.detalle ?? ""} · ${row.ms ?? "?"} ms`);
}

console.table(rows);
const ok = rows.filter((r) => r.accion === "ok");
const lat = rows.map((r) => r.ms).filter(Boolean).sort((a, b) => a - b);
console.log(`Guías: ${ok.length}/${rows.length} · con recomendación: ${ok.filter((r) => r.recomendacion !== "—").length} · latencia mediana: ${lat[Math.floor(lat.length / 2)] ?? "?"} ms`);
console.log("Tokens y caché por escaneo: select modelo, tokens_entrada, tokens_salida, tokens_cache, latencia_ms from wine_scans order by created_at desc;");
