import { imagenOg, fotoOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Wine Scan de Viviendo Vino: fotografía la etiqueta y conoce tu vino";

export default async function Image() {
  return imagenOg({ variante: "foto", foto: await fotoOg("wine-scan.jpg"), etiqueta: "Wine Scan", titulo: "Fotografía la etiqueta y conoce tu vino.", texto: "Gratis y sin registro, desde tu celular." });
}
