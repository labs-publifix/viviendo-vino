import { imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Envíos de Viviendo Vino";

export default async function Image() {
  return imagenOg({ variante: "letras", tono: "vino", etiqueta: "Envíos", titulo: "El envío va incluido en el precio.", texto: "Enviamos tu kit a todo México." });
}
