// Lectura del feed de Instagram de Behold (JSON). Lógica pura, sin imports de Next, para usarla igual en el
// servidor (lib/instagram.ts) y en las pruebas (tests/instagram.test.mjs).
// Solo se aceptan imágenes de behold.pictures y sus subdominios (las de "sizes", estables) y enlaces de instagram.com.
// Nunca se usan mediaUrl ni thumbnailUrl de nivel superior: en reels son .mp4 o enlaces firmados que caducan.

export type InstagramPost = {
  id: string;
  permalink: string;
  isVideo: boolean;
  alt: string;
  /** Tamaños de Behold con su ancho real (conservan la proporción original: un reel llega vertical). */
  images: { url: string; width: number }[];
  /** Imagen por omisión del cuadro: el tamaño medio. */
  src: string;
};

export const FEED_ALT_FALLBACK = "Publicación de @viviendovino en Instagram";
const MAX_POSTS = 6;

const isImage = (u: unknown): u is string => {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && (url.hostname === "behold.pictures" || url.hostname.endsWith(".behold.pictures"));
  } catch {
    return false;
  }
};

const isPermalink = (u: unknown): u is string => {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && (url.hostname === "instagram.com" || url.hostname.endsWith(".instagram.com"));
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

type RawSize = { mediaUrl?: unknown; width?: unknown } | undefined;
const DEFAULT_WIDTH: Record<string, number> = { small: 400, medium: 700, large: 1000 };
type RawPost = { id?: unknown; permalink?: unknown; mediaType?: unknown; prunedCaption?: unknown; sizes?: Record<string, RawSize> };

/** Convierte el JSON de Behold en las publicaciones a mostrar, en el orden en que llegan. Ignora las inválidas. */
export function parseFeed(json: unknown): InstagramPost[] {
  const posts = (json as { posts?: unknown })?.posts;
  if (!Array.isArray(posts)) return [];
  const out: InstagramPost[] = [];
  for (const raw of posts as RawPost[]) {
    if (out.length >= MAX_POSTS) break;
    const s = raw?.sizes ?? {};
    const images = (["small", "medium", "large"] as const)
      .map((k) => ({ url: s[k]?.mediaUrl, width: typeof s[k]?.width === "number" && (s[k]!.width as number) > 0 ? (s[k]!.width as number) : DEFAULT_WIDTH[k] }))
      .filter((i): i is { url: string; width: number } => isImage(i.url));
    const medium = s.medium?.mediaUrl;
    if (!isImage(medium) || !isPermalink(raw.permalink)) continue;
    out.push({
      id: typeof raw.id === "string" ? raw.id : String(raw.id ?? out.length),
      permalink: raw.permalink,
      isVideo: raw.mediaType === "VIDEO",
      alt: altFromCaption(raw.prunedCaption),
      images,
      src: medium,
    });
  }
  return out;
}

/** Resumen del JSON para el log cuando no sale ninguna publicación válida (sin textos ni datos de personas). */
export function describeFeed(json: unknown): string {
  const posts = (json as { posts?: unknown })?.posts;
  if (!Array.isArray(posts)) return `sin arreglo "posts" (claves: ${Object.keys((json as object) ?? {}).join(", ") || "ninguna"})`;
  const first = posts[0] as RawPost | undefined;
  const host = (u: unknown) => {
    try {
      return new URL(String(u)).hostname;
    } catch {
      return String(u ?? "vacío").slice(0, 40);
    }
  };
  return `${posts.length} publicaciones; primera: sizes=[${Object.keys(first?.sizes ?? {}).join(",")}], medium=${host(first?.sizes?.medium?.mediaUrl)}, permalink=${host(first?.permalink)}`;
}
