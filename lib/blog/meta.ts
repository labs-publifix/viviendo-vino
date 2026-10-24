// Datos del blog que se usan en servidor y cliente: variantes de color, orden de categorías y fechas.

/**
 * Variantes del bloque de color (Manual §6). Ver los colores exactos en app/_ui/ArticleCard.module.css.
 * - oscuro: negro tinto con la atmósfera de marca; cifra en orquídea (§6: cifras sobre oscuro).
 * - claro: hueso con texto negro tinto; cifra en vino.
 * - vino: vino pleno con texto hueso (6.8:1, combinación aprobada); el vino como acento puntual.
 * - acento: ciruela con texto hueso y cifra en orquídea. Reservado a las guías.
 */
export const BLOG_COLORS = ["oscuro", "claro", "vino", "acento"] as const;
export type BlogColor = (typeof BLOG_COLORS)[number];

/** Orden editorial de los filtros; las categorías nuevas se agregan al final. */
export const CATEGORY_ORDER = ["Guías de maridaje", "Aprende", "Del catálogo"];

export const AUTHOR = { name: "Rafa Aguirre", role: "Fundador de Viviendo Vino", avatar: "/img/rafa-avatar.webp" };

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10-22" → "22 de octubre de 2026" (sin depender de la zona horaria). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

export const typeLabel = (tipo: "articulo" | "guia") => (tipo === "guia" ? "Guía" : "Artículo");
