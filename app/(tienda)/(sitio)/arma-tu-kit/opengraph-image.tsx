import { imagenOg, fotoOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de esta sección (lib/og/plantilla.tsx). Sin precios.
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Arma tu kit de 6 botellas en Viviendo Vino";

export default async function Image() {
  return imagenOg({ variante: "foto", foto: await fotoOg("arma-tu-kit.jpg"), etiqueta: "Arma tu kit", titulo: "Seis botellas, una regla.", texto: "Elige 6 vinos del mismo grupo. El envío va incluido en el precio." });
}
