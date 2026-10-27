import type { BottleGroup } from "./types";

// Imágenes de la portada (generadas por scripts/build-home-images.mjs). Viven en el código y no en la
// base porque aún no hay panel de administración; al tenerlo pasan a columnas de grupos y kits.

export const GROUP_IMAGES: Record<BottleGroup, { src: string; alt: string }> = {
  azul: { src: "/img/grupos/azul.webp", alt: "Soave, Pinot Grigio Blush, Merlot y Langhe Nebbiolo, vinos de La Selezione" },
  rojo: { src: "/img/grupos/rojo.webp", alt: "Don Carlo, Primitivo di Manduria, Valpolicella Ripasso y Amarone, vinos de I Grandi Rossi" },
  verde: { src: "/img/grupos/verde.webp", alt: "Sangiovese Primitivo y Primitivo de Bodega Rocca, vinos de Selezione d’Oro" },
  amarillo: { src: "/img/grupos/amarillo.webp", alt: "Prosecco Carlo V y Rosé 921 de Collevento, vinos de Bollicine" },
};

/** Fotos de los 3 kits originales; un kit con foto subida desde el panel usa esa (PresetKit.imageUrl). */
export const KIT_IMAGES: Record<string, string> = {
  "blancos-frescos": "/img/kits/blancos-frescos.webp",
  "tintos-de-diario": "/img/kits/tintos-de-diario.webp",
  burbujas: "/img/kits/burbujas.webp",
};
