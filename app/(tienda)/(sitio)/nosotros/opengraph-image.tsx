import { imagenOg, fotoOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Rafa Aguirre, de Viviendo Vino";

export default async function Image() {
  return imagenOg({ variante: "foto", foto: await fotoOg("nosotros.jpg"), etiqueta: "Nosotros", titulo: "Una forma directa de comprar buen vino.", texto: "Conoce a Rafa Aguirre, quien elige cada vino." });
}
