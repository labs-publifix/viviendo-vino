import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// Metadatos de cada página pública, siempre completos y consistentes: título, descripción, URL canónica absoluta,
// Open Graph (WhatsApp, Facebook, LinkedIn) y la tarjeta de X. Sin esto, una página que no define su openGraph
// hereda el del diseño raíz (la lista de espera).
//
// La imagen para compartir: si la sección tiene su opengraph-image.tsx, NO se pasa `imagen` (Next agrega la del
// archivo solo cuando openGraph no trae la clave `images`). Si se pasa, se usa esa URL.

export const MARCA = "Viviendo Vino";

export type Seo = {
  /** Título completo de la pestaña y de Google (~60 caracteres), ya con la marca. */
  titulo: string;
  /** 140–160 caracteres, única por página. */
  descripcion: string;
  /** Ruta canónica: "/", "/vinos", "/vinos/langhe-nebbiolo"… */
  ruta: string;
  /** Título y descripción para compartir, si conviene que sean distintos a los de Google. */
  tituloSocial?: string;
  descripcionSocial?: string;
  imagen?: { url: string; alt: string };
  tipo?: "website" | "article";
};

/** "/vinos" → "https://www.viviendovino.com/vinos". Una URL completa (fotos subidas desde el panel) se deja igual. */
export const urlAbsoluta = (ruta: string) => (/^https?:\/\//.test(ruta) ? ruta : `${SITE_URL}${ruta.startsWith("/") ? ruta : `/${ruta}`}`);

export function seo(p: Seo): Metadata {
  const url = urlAbsoluta(p.ruta);
  const title = p.tituloSocial ?? p.titulo;
  const description = p.descripcionSocial ?? p.descripcion;
  return {
    title: { absolute: p.titulo },
    description: p.descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: p.tipo ?? "website",
      locale: "es_MX",
      siteName: MARCA,
      url,
      title,
      description,
      ...(p.imagen ? { images: [{ url: p.imagen.url, width: 1200, height: 630, alt: p.imagen.alt }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Recorta un texto a `max` caracteres sin partir palabras (para descripciones que vienen de la base). */
export function recortar(texto: string, max = 155): string {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), max - 20)).replace(/[\s,.;:—-]+$/, "")}…`;
}
