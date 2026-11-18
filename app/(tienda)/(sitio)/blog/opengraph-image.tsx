import { imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Blog y guías de Viviendo Vino";

export default async function Image() {
  return imagenOg({ variante: "letras", tono: "oscuro", etiqueta: "Blog y guías", titulo: "Aprende de vino sin complicarte.", texto: "Artículos y guías de maridaje de Rafa Aguirre, en palabras sencillas." });
}
