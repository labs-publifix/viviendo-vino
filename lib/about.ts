// Contenido de Rafa Aguirre (portada y /nosotros). Todo lo que vale null está [PENDIENTE]: en el preview
// se ve un placeholder y en producción esa pieza no se muestra. No se inventan datos de Rafa.
// Para publicarlo, basta con llenar estos campos.

/** Foto de Rafa (ruta en public/, idealmente 4:5). */
export const RAFA_PHOTO: { src: string; width: number; height: number } | null = null;

/** Historia de Rafa con el vino, con sus palabras. Un párrafo por elemento. */
export const RAFA_STORY: string[] | null = null;

/** Una frase de Rafa para destacar. */
export const RAFA_QUOTE: string | null = null;

/** Criterios reales con los que Rafa elige cada vino (3 o 4). */
export const RAFA_CRITERIA: { title: string; text: string }[] | null = null;

/** Despliegue de vista previa (dev.viviendovino.com): aquí se ven los placeholders y avisos de ejemplo. */
export const IS_PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "true";
