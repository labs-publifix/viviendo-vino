import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/blog/content";
import { getCatalog } from "@/lib/catalog/repo";
import { SERVICIOS, rutaServicio } from "@/lib/servicios/contenido";
import { urlAbsoluta } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

// Con la tienda cerrada solo la portada (lista de espera). Con STORE_OPEN=true, todas las páginas públicas: catálogo,
// fichas, Descubrir (Wine Scan, Quiz IA, blog, Nosotros), servicios, contacto e información legal. Carrito, checkout
// y API quedan fuera (robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = { url: `${SITE_URL}/`, changeFrequency: "daily" as const, priority: 1 };
  if (process.env.STORE_OPEN !== "true") return [home];

  const { wines } = await getCatalog();
  return [
    { ...home, images: [`${SITE_URL}/img/hero-rafa.webp`] },
    { url: `${SITE_URL}/vinos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/arma-tu-kit`, changeFrequency: "weekly", priority: 0.9 },
    ...wines.map((w) => ({
      url: `${SITE_URL}/vinos/${w.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(w.imageUrl ? { images: [urlAbsoluta(w.imageUrl)] } : {}),
    })),
    { url: `${SITE_URL}/wine-scan`, changeFrequency: "monthly", priority: 0.8, images: [`${SITE_URL}/img/wine-scan/hero-688.webp`] },
    { url: `${SITE_URL}/quiz`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/nosotros`, changeFrequency: "monthly", priority: 0.6, images: [`${SITE_URL}/img/rafa.webp`] },
    { url: `${SITE_URL}/servicios`, changeFrequency: "monthly", priority: 0.6 },
    ...SERVICIOS.map((s) => ({
      url: `${SITE_URL}${rutaServicio(s.slug)}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      images: [`${SITE_URL}/img/servicios/${s.slug}/og.jpg`],
    })),
    { url: `${SITE_URL}/contacto`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/envios`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/preguntas-frecuentes`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    ...(await getArticles())
      .filter((a) => !a.ejemplo && !a.programado)
      .map((a) => ({ url: `${SITE_URL}/blog/${a.slug}`, lastModified: a.actualizado ?? a.fecha, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
