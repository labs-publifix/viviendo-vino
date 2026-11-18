import { imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Preguntas frecuentes de Viviendo Vino";

export default async function Image() {
  return imagenOg({ variante: "letras", tono: "vino", etiqueta: "Preguntas frecuentes", titulo: "Kits, pagos, envíos y facturas.", texto: "Las respuestas a lo que más nos preguntan." });
}
