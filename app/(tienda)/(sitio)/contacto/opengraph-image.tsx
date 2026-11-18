import { imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Contacto de Viviendo Vino";

export default async function Image() {
  return imagenOg({ variante: "letras", tono: "vino", etiqueta: "Contacto", titulo: "Escríbenos o llámanos.", texto: "Lunes a viernes, de 9:00 a 18:00 (hora CDMX)." });
}
