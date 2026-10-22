import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog/repo";
import { SITE_URL } from "@/lib/site";

// Con la tienda cerrada solo la portada (lista de espera). Con STORE_OPEN=true, también catálogo, fichas y
// páginas informativas. Carrito, checkout y legales quedan fuera (robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = { url: `${SITE_URL}/`, changeFrequency: "daily" as const, priority: 1 };
  if (process.env.STORE_OPEN !== "true") return [home];

  const { wines } = await getCatalog();
  return [
    home,
    { url: `${SITE_URL}/vinos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/arma-tu-kit`, changeFrequency: "weekly", priority: 0.9 },
    ...wines.map((w) => ({ url: `${SITE_URL}/vinos/${w.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/envios`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/preguntas-frecuentes`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
