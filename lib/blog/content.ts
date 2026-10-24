import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";
import { z } from "zod";
import { BLOG_COLORS, CATEGORY_ORDER, type BlogColor } from "./meta";

// Blog en archivos: un .md por artículo en content/blog/ (datos al inicio + texto en Markdown).
// Sin base de datos: se escribe desde Claude Code siguiendo content/blog/README.md.

const DIR = join(process.cwd(), "content/blog");
const WORDS_PER_MINUTE = 200;

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
  slug: z.string().regex(/^[a-z0-9-]+$/, "solo minúsculas, números y guiones"),
  extracto: z.string().min(1),
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
  "slug" | "titulo" | "extracto" | "tipo" | "categoria" | "color" | "cifra" | "fecha" | "pdf" | "ejemplo" | "minutos"
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
          minutos: readingMinutes(content),
          toc: r.toc,
          introHtml: r.introHtml,
          bodyHtml: r.bodyHtml,
        } satisfies Article,
      };
    })
    .filter((a) => a.publicado)
    .map((a) => a.article)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

let cache: Article[] | null = null;

/** Artículos publicados, del más reciente al más antiguo. */
export function getArticles(): Article[] {
  if (!cache || process.env.NODE_ENV === "development") cache = loadAll();
  return cache;
}

export function getArticle(slug: string): Article | null {
  return getArticles().find((a) => a.slug === slug) ?? null;
}

export function toSummary(a: Article): ArticleSummary {
  const { slug, titulo, extracto, tipo, categoria, color, cifra, fecha, pdf, ejemplo, minutos } = a;
  return { slug, titulo, extracto, tipo, categoria, color, cifra, fecha, pdf, ejemplo, minutos };
}

/** Categorías que existen en los artículos publicados, en el orden editorial. */
export function getCategories(): string[] {
  const present = [...new Set(getArticles().map((a) => a.categoria))];
  return [...CATEGORY_ORDER.filter((c) => present.includes(c)), ...present.filter((c) => !CATEGORY_ORDER.includes(c))];
}

/** Relacionados: primero de la misma categoría, luego los más recientes. */
export function getRelated(slug: string, count = 3): ArticleSummary[] {
  const all = getArticles();
  const current = all.find((a) => a.slug === slug);
  const others = all.filter((a) => a.slug !== slug);
  const same = others.filter((a) => a.categoria === current?.categoria);
  const rest = others.filter((a) => a.categoria !== current?.categoria);
  return [...same, ...rest].slice(0, count).map(toSummary);
}
