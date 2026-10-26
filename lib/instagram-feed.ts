// Lectura del feed de Instagram de Behold (JSON). Lógica pura, sin imports de Next, para usarla igual en el
// servidor (lib/instagram.ts) y en las pruebas (tests/instagram.test.mjs).
// Solo se aceptan imágenes de hop.behold.pictures (las de "sizes", estables) y enlaces de instagram.com.
// Nunca se usan mediaUrl ni thumbnailUrl de nivel superior: en reels son .mp4 o enlaces firmados que caducan.

export type InstagramPost = {
  id: string;
  permalink: string;
  isVideo: boolean;
  alt: string;
  /** small (400), medium (700) y large (1000), cuadradas. */
  images: { small: string; medium: string; large: string };
};

export const FEED_ALT_FALLBACK = "Publicación de @viviendovino en Instagram";
const MAX_POSTS = 6;

const isImage = (u: unknown): u is string => {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname === "hop.behold.pictures";
  } catch {
    return false;
  }
};

const isPermalink = (u: unknown): u is string => {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && (url.hostname === "www.instagram.com" || url.hostname === "instagram.com");
  } catch {
    return false;
  }
};

/** Primeras palabras del texto sin hashtags; si no hay, el texto de respaldo. */
export function altFromCaption(caption: unknown, words = 10): string {
  if (typeof caption !== "string") return FEED_ALT_FALLBACK;
  const parts = caption.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return FEED_ALT_FALLBACK;
  const text = parts.slice(0, words).join(" ").replace(/[\s,;:.–—-]+$/u, "");
  return parts.length > words ? `${text}…` : text;
}

type RawSize = { mediaUrl?: unknown } | undefined;
type RawPost = { id?: unknown; permalink?: unknown; mediaType?: unknown; prunedCaption?: unknown; sizes?: Record<string, RawSize> };

/** Convierte el JSON de Behold en las publicaciones a mostrar, en el orden en que llegan. Ignora las inválidas. */
export function parseFeed(json: unknown): InstagramPost[] {
  const posts = (json as { posts?: unknown })?.posts;
  if (!Array.isArray(posts)) return [];
  const out: InstagramPost[] = [];
  for (const raw of posts as RawPost[]) {
    if (out.length >= MAX_POSTS) break;
    const s = raw?.sizes ?? {};
    const small = s.small?.mediaUrl;
    const medium = s.medium?.mediaUrl;
    const large = s.large?.mediaUrl;
    if (!isImage(medium) || !isPermalink(raw.permalink)) continue;
    out.push({
      id: typeof raw.id === "string" ? raw.id : String(raw.id ?? out.length),
      permalink: raw.permalink,
      isVideo: raw.mediaType === "VIDEO",
      alt: altFromCaption(raw.prunedCaption),
      images: { small: isImage(small) ? small : medium, medium, large: isImage(large) ? large : medium },
    });
  }
  return out;
}
