import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog, getWine } from "@/lib/catalog/repo";
import { TYPE_LABELS } from "@/lib/catalog/types";
import { fotoOg, imagenOg, OG_SIZE, OG_TYPE } from "@/lib/og/plantilla";

// Imagen para compartir de cada vino: su botella, nombre, tipo y región. Sin precio (las redes guardan la
// imagen por semanas). Si un vino nuevo todavía no tiene recorte en public/img/og/vinos/, sale sin foto.

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Botella de vino italiano de Viviendo Vino";

const CLOSED = "__tienda-cerrada__";

export async function generateStaticParams() {
  if (!storeEnabled()) return [{ slug: CLOSED }];
  const { wines } = await getCatalog();
  return wines.length > 0 ? wines.map((w) => ({ slug: w.slug })) : [{ slug: CLOSED }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wine = storeEnabled() && slug !== CLOSED ? (await getWine(slug)).wine : null;
  if (!wine) {
    return imagenOg({ variante: "letras", tono: "vino", etiqueta: "Los vinos", titulo: "Vinos italianos para tu kit." });
  }
  const foto = await fotoOg(`vinos/${wine.slug}.jpg`);
  return imagenOg({
    variante: "foto",
    foto,
    ancho: 480,
    etiqueta: [TYPE_LABELS[wine.type], wine.region].filter(Boolean).join(" · "),
    titulo: wine.name,
    texto: `${wine.producer}. En kits de 6 botellas con envío incluido.`,
  });
}
