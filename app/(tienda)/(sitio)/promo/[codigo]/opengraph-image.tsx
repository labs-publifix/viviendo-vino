import { storeEnabled } from "@/lib/catalog/enabled";
import { fotoOg, imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";
import { codigosActivos, promoPorCodigo } from "@/lib/promo";

// Imagen para compartir del enlace de un código: la cifra en grande, el texto público del panel y el código.
// Si el código no existe o ya no se puede usar, la imagen general de la tienda.

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Código de descuento de Viviendo Vino";

const RELLENO = "PROMO";

export async function generateStaticParams() {
  const codigos = storeEnabled() ? await codigosActivos() : [];
  return (codigos.length > 0 ? codigos : [RELLENO]).map((codigo) => ({ codigo }));
}

export default async function Image({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const p = storeEnabled() ? await promoPorCodigo(codigo) : null;
  if (!p || (p.estado !== "vigente" && p.estado !== "programado")) {
    return imagenOg({ variante: "foto", foto: await fotoOg("arma-tu-kit.jpg"), etiqueta: "Arma tu kit", titulo: "Seis botellas, una regla.", texto: "Elige 6 vinos del mismo grupo. El envío va incluido en el precio." });
  }
  return imagenOg({
    variante: "promo",
    etiqueta: "Código de descuento",
    cifra: p.cifra,
    titulo: p.titular.replace(`${p.cifra} `, ""),
    texto: p.textoPublico,
    codigo: p.codigo,
    foto: await fotoOg("arma-tu-kit.jpg"),
  });
}
