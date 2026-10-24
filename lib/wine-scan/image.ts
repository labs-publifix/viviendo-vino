// Preparación de la foto en el navegador antes de subirla: orientación correcta (EXIF), lado largo de 1280 px
// y JPEG de calidad 0.8. Así la foto pesa unos cientos de KB y cabe en el límite de la función.

export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.8;

/** Medidas que caben en `max` px por lado sin deformar ni agrandar. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap con imageOrientation aplica la rotación EXIF de la cámara.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Navegadores sin soporte de la opción: se usa <img>, que también respeta EXIF por defecto.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressPhoto(file: Blob): Promise<Blob> {
  const source = await decode(file);
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const size = fitWithin(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(source, 0, 0, size.width, size.height);
  if ("close" in source) source.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", JPEG_QUALITY),
  );
}
