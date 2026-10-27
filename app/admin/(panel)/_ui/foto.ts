// Fotos que se suben desde el panel: se recortan al centro al tamaño exacto que usa la tienda y se convierten a
// WebP (o JPG si el navegador no sabe WebP) antes de enviarlas. Así pesan poco y todas se ven parejas.

export async function recortarFoto(file: File, ancho: number, alto: number): Promise<File> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d")!;
  const escala = Math.max(ancho / bmp.width, alto / bmp.height);
  const w = bmp.width * escala;
  const h = bmp.height * escala;
  ctx.drawImage(bmp, (ancho - w) / 2, (alto - h) / 2, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.86));
  const final = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.88));
  if (!final) throw new Error("No se pudo preparar la foto.");
  return new File([final], final.type === "image/webp" ? "foto.webp" : "foto.jpg", { type: final.type });
}
