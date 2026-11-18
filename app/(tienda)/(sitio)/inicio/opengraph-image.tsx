import { imagenOg, fotoOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Viviendo Vino: arma tu kit de 6 botellas de vino italiano con envío incluido";

export default async function Image() {
  return imagenOg({ variante: "foto", foto: await fotoOg("inicio.jpg"), etiqueta: "Vino italiano en línea", titulo: "Arma tu kit de 6 botellas.", texto: "Tú eliges los vinos. El envío a todo México va incluido en el precio." });
}
