import { imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Quiz IA de Viviendo Vino: ¿qué perfil de vino eres?";

export default async function Image() {
  return imagenOg({ variante: "letras", tono: "acento", etiqueta: "Quiz IA", titulo: "¿Qué perfil de vino eres?", texto: "Ocho preguntas, unos 90 segundos. Al final, tu caja de 6 vinos.", lista: ["8 preguntas", "90 segundos", "Tu caja de 6 vinos"] });
}
