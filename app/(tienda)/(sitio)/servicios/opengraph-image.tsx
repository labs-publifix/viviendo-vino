import { imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Servicios de Viviendo Vino para el mundo del vino";

export default async function Image() {
  return imagenOg({ variante: "letras", tono: "vino", etiqueta: "Servicios", titulo: "Servicios para el mundo del vino.", lista: ["Marketing", "Experiencias con IA", "Consultoría", "Regalos corporativos"] });
}
