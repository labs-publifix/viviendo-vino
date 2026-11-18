import { imagenOg, fotoOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Vinos italianos de Viviendo Vino para armar tu kit";

export default async function Image() {
  return imagenOg({ variante: "foto", foto: await fotoOg("vinos.jpg"), etiqueta: "Los vinos", titulo: "Vinos italianos para tu kit.", texto: "Blancos, rosado, tintos y espumosos. Envío incluido a todo México." });
}
