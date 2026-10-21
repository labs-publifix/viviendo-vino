import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Por ahora solo la portada. Las rutas de la tienda se agregan aquí cuando la tienda abra (ver LAUNCH.md).
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 }];
}
