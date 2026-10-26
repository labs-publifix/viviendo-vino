import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { describeFeed, parseFeed, type InstagramPost } from "./instagram-feed";

// Feed de Instagram de @viviendovino vía Behold (INSTAGRAM_FEED_URL, solo servidor). Se cachea 1 hora;
// si falla, devuelve una lista vacía (la página muestra los cuadros de espera) y se vuelve a intentar en minutos.

export async function getInstagramPosts(): Promise<InstagramPost[]> {
  "use cache";
  cacheTag("instagram");
  const url = process.env.INSTAGRAM_FEED_URL?.trim();
  if (!url) {
    console.warn("instagram: falta INSTAGRAM_FEED_URL; se muestran los cuadros de espera");
    cacheLife("minutes");
    return [];
  }
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`respuesta ${res.status}`);
    const json = await res.json();
    const posts = parseFeed(json);
    if (posts.length === 0) throw new Error(`el feed llegó sin publicaciones válidas: ${describeFeed(json)}`);
    cacheLife("hours");
    console.info(`instagram: feed leído, ${posts.length} publicaciones`);
    return posts;
  } catch (err) {
    console.error("instagram: no se pudo leer el feed", err instanceof Error ? err.message : err);
    cacheLife("minutes");
    return [];
  }
}
