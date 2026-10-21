import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Preview: nada se indexa. Tienda cerrada: solo la portada (lista de espera); se bloquea todo lo demás
// sin nombrar rutas, para no dejar pistas de la tienda. Tienda abierta: todo salvo áreas privadas.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_PREVIEW === "true") return { rules: { userAgent: "*", disallow: "/" } };
  if (process.env.STORE_OPEN !== "true") {
    return {
      rules: { userAgent: "*", allow: ["/$", "/_next/", "/brand/", "/opengraph-image.png"], disallow: "/" },
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/carrito", "/checkout", "/baja", "/correos"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
