/** URL pública del sitio, sin diagonal final. Se usa en correos y metadatos. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.viviendovino.com").replace(/\/+$/, "");
