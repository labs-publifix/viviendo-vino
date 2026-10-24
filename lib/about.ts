// Foto de Rafa Aguirre para la sección Nosotros. Mientras sea null, el preview muestra un placeholder
// y producción muestra la sección sin foto.
export const RAFA_PHOTO: { src: string; width: number; height: number } | null = null;

/** Despliegue de vista previa (dev.viviendovino.com): aquí se ven los placeholders y avisos de ejemplo. */
export const IS_PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "true";
