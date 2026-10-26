import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { cacheLife, cacheTag } from "next/cache";
import { Marked } from "marked";
import { z } from "zod";
import { BLOG_COLORS, CATEGORY_ORDER, type BlogColor } from "./meta";

// Blog en archivos: un .md por artículo en content/blog/ (datos al inicio + texto en Markdown).
// Sin base de datos: se escribe desde Claude Code siguiendo content/blog/README.md.
//
// Publicación programada: cada artículo sale el día de su `fecha` a las 9:00 am CDMX (15:00 UTC; México ya
// no cambia de horario). La lista se calcula dentro de una caché de minutos, así que el artículo aparece
// solo, sin desplegar, a más tardar un par de minutos después de su hora. En dev (preview) se ven también
// los programados, marcados como tales, para revisarlos antes; los de ejemplo nunca llegan a producción.

const DIR = join(process.cwd(), "content/blog");
const WORDS_PER_MINUTE = 200;
const PUBLISH_TIME_UTC = "T15:00:00Z";
const SHOW_SCHEDULED = process.env.NEXT_PUBLIC_PREVIEW === "true" || process.env.NODE_ENV === "development";

/** Momento de publicación de un artículo: su fecha a las 9:00 am hora del centro de México. */
export const publishAt = (fecha: string) => Date.parse(`${fecha}${PUBLISH_TIME_UTC}`);

const fecha = z.union([z.string(), z.date()]).transform((v, ctx) => {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    ctx.addIssue({ code: "custom", message: "la fecha va como AAAA-MM-DD" });
    return z.NEVER;
  }
  return s;
});

const frontMatter = z.object({
  titulo: z.string().min(1),
  /** Title tag para buscadores, con " | Viviendo Vino" (máximo 60 caracteres). */
  titulo_seo: z.string().max(60, "el title tag lleva máximo 60 caracteres").optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "solo minúsculas, números y guiones"),
  extracto: z.string().min(1),
  /** Slugs de artículos relacionados (columna Relacionados del backlog), en orden de preferencia. */
  relacionados: z.array(z.string()).default([]),
  tipo: z.enum(["articulo", "guia"]),
  categoria: z.string().min(1),
  color: z.enum(BLOG_COLORS),
  cifra: z.union([z.string(), z.number()]).optional(),
  fecha,
  actualizado: fecha.optional(),
  pdf: z.string().optional(),
  resumen: z.array(z.string()).min(1).max(4),
  vinos: z.array(z.string()).default([]),
  preguntas: z.array(z.object({ pregunta: z.string(), respuesta: z.string() })).default([]),
  publicado: z.boolean(),
  ejemplo: z.boolean().default(false),
});

export type TocItem = { id: string; text: string };

export type Article = {
  slug: string;
  titulo: string;
  tituloSeo: string;
  relacionados: string[];
  extracto: string;
  tipo: "articulo" | "guia";
  categoria: string;
  color: BlogColor;
  cifra: string;
  fecha: string;
  actualizado: string | null;
  pdf: string | null;
  /** Frases de "En pocas palabras", ya en HTML en línea (permite negritas). */
  resumen: string[];
  vinos: string[];
  preguntas: { pregunta: string; respuesta: string }[];
  ejemplo: boolean;
  /** Solo en dev: todavía no llega su fecha de publicación. */
  programado: boolean;
  minutos: number;
  toc: TocItem[];
  /** Texto antes del primer título de segundo nivel (la introducción). */
  introHtml: string;
  /** El resto del texto, desde el primer título de segundo nivel. */
  bodyHtml: string;
};

/** Lo que necesita una tarjeta (se puede pasar a componentes de cliente). */
export type ArticleSummary = Pick<
  Article,
  "slug" | "titulo" | "extracto" | "tipo" | "categoria" | "color" | "cifra" | "fecha" | "pdf" | "ejemplo" | "programado" | "minutos"
>;

export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// El índice se pinta como texto (React escapa por su cuenta): se quitan las entidades de marked.
const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" };
const decodeEntities = (s: string) => s.replace(/&(amp|quot|#39|lt|gt);/g, (m) => ENTITIES[m]);

function render(markdown: string) {
  const toc: TocItem[] = [];
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        if (depth !== 2) return `<h${depth}>${html}</h${depth}>\n`;
        const text = decodeEntities(html.replace(/<[^>]+>/g, ""));
        const base = slugifyHeading(text) || "seccion";
        let id = base;
        for (let n = 2; toc.some((t) => t.id === id); n++) id = `${base}-${n}`;
        toc.push({ id, text });
        return `<h2 id="${id}">${html}</h2>\n`;
      },
      // Las tablas se desplazan de lado en pantallas angostas.
      table(token) {
        const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join("");
        const rows = token.rows
          .map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`)
          .join("");
        return `<div class="vv-table" role="region" tabindex="0" aria-label="Tabla"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  const html = md.parse(markdown) as string;
  const cut = html.indexOf("<h2");
  return {
    toc,
    introHtml: cut === -1 ? html : html.slice(0, cut),
    bodyHtml: cut === -1 ? "" : html.slice(cut),
    inline: (s: string) => md.parseInline(s) as string,
  };
}

function readingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|\-[\]()!]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function loadAll(): Article[] {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".md") && f === f.toLowerCase() && !f.startsWith("_"));
  const parsed = files.map((file) => {
    const { data, content } = matter(readFileSync(join(DIR, file), "utf8"));
    const result = frontMatter.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`content/blog/${file}: ${issues}`);
    }
    return { fm: result.data, content };
  });

  // Número consecutivo por fecha (el más antiguo es 01), para la cifra cuando el archivo no trae una.
  const byDate = [...parsed].sort((a, b) => a.fm.fecha.localeCompare(b.fm.fecha));
  const seen = new Set<string>();
  return parsed
    .map(({ fm, content }) => {
      if (seen.has(fm.slug)) throw new Error(`content/blog: slug repetido "${fm.slug}"`);
      seen.add(fm.slug);
      const r = render(content);
      const n = byDate.findIndex((p) => p.fm.slug === fm.slug) + 1;
      return {
        publicado: fm.publicado,
        article: {
          slug: fm.slug,
          titulo: fm.titulo,
          tituloSeo: fm.titulo_seo ?? `${fm.titulo} | Viviendo Vino`,
          relacionados: fm.relacionados,
          extracto: fm.extracto,
          tipo: fm.tipo,
          categoria: fm.categoria,
          color: fm.color,
          cifra: fm.cifra !== undefined ? String(fm.cifra) : String(n).padStart(2, "0"),
          fecha: fm.fecha,
          actualizado: fm.actualizado && fm.actualizado !== fm.fecha ? fm.actualizado : null,
          pdf: fm.pdf ?? null,
          resumen: fm.resumen.map(r.inline),
          vinos: fm.vinos,
          preguntas: fm.preguntas.map((p) => ({ pregunta: p.pregunta, respuesta: r.inline(p.respuesta) })),
          ejemplo: fm.ejemplo,
          programado: false,
          minutos: readingMinutes(content),
          toc: r.toc,
          introHtml: r.introHtml,
          bodyHtml: r.bodyHtml,
        } satisfies Article,
      };
    })
    .filter((a) => a.publicado)
    .map((a) => a.article)
    // Del más reciente al más antiguo; en la misma fecha, la cifra más alta primero.
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || (Number(b.cifra) || 0) - (Number(a.cifra) || 0));
}

let cache: Article[] | null = null;

function allArticles(): Article[] {
  if (!cache || process.env.NODE_ENV === "development") cache = loadAll();
  return cache;
}

/** Artículos visibles hoy, del más reciente al más antiguo. En dev incluye los programados. */
export async function getArticles(): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("blog");
  const now = Date.now();
  return allArticles()
    .map((a) => ({ ...a, programado: publishAt(a.fecha) > now }))
    .filter((a) => SHOW_SCHEDULED || (!a.programado && !a.ejemplo));
}

export async function getArticle(slug: string): Promise<Article | null> {
  return (await getArticles()).find((a) => a.slug === slug) ?? null;
}

export function toSummary(a: Article): ArticleSummary {
  const { slug, titulo, extracto, tipo, categoria, color, cifra, fecha, pdf, ejemplo, programado, minutos } = a;
  return { slug, titulo, extracto, tipo, categoria, color, cifra, fecha, pdf, ejemplo, programado, minutos };
}

/** Categorías presentes en los artículos, en el orden editorial. */
export function getCategories(articles: Pick<Article, "categoria">[]): string[] {
  const present = [...new Set(articles.map((a) => a.categoria))];
  return [...CATEGORY_ORDER.filter((c) => present.includes(c)), ...present.filter((c) => !CATEGORY_ORDER.includes(c))];
}

/** Relacionados: primero los de la ficha, luego los de la misma categoría y después los más recientes. */
export async function getRelated(slug: string, count = 3): Promise<ArticleSummary[]> {
  const all = await getArticles();
  const current = all.find((a) => a.slug === slug);
  const others = all.filter((a) => a.slug !== slug);
  const picked = (current?.relacionados ?? []).map((s) => others.find((a) => a.slug === s)).filter((a) => a !== undefined);
  const same = others.filter((a) => a.categoria === current?.categoria);
  const ordered = [...new Set([...picked, ...same, ...others])];
  return ordered.slice(0, count).map(toSummary);
}

/** Para el panel (/admin/contenido/blog): todos los archivos, incluidos borradores y programados. Sin caché. */
export type ArticleFile = { slug: string; titulo: string; fecha: string; tipo: "articulo" | "guia"; categoria: string; publicado: boolean; ejemplo: boolean; minutos: number; pdf: string | null };
export function listArticleFiles(): ArticleFile[] {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".md") && f === f.toLowerCase() && !f.startsWith("_"));
  return files.flatMap((file) => {
    const { data, content } = matter(readFileSync(join(DIR, file), "utf8"));
    const r = frontMatter.safeParse(data);
    if (!r.success) return [];
    const fm = r.data;
    return [{ slug: fm.slug, titulo: fm.titulo, fecha: fm.fecha, tipo: fm.tipo, categoria: fm.categoria, publicado: fm.publicado, ejemplo: fm.ejemplo, minutos: readingMinutes(content), pdf: fm.pdf ?? null }];
  });
}

/** El backlog editorial (content/blog/BACKLOG.md), tal cual, para que el panel lo lea. */
export function readBacklog(): string {
  return readFileSync(join(DIR, "BACKLOG.md"), "utf8");
}
