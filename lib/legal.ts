import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";
import { z } from "zod";
import { slugifyHeading } from "@/lib/blog/content";

// Documentos legales autorizados (content/legal/*.md, transcritos tal cual de los .docx del 5 nov 2026). Se convierten
// a HTML en el servidor; los títulos de sección ("1. Cobertura") forman el índice de la página.

export type LegalSlug = "envios" | "terminos" | "privacidad";
export type LegalTocItem = { id: string; n: string | null; text: string };
export type LegalDoc = { titulo: string; etiqueta: string; actualizado: string; seo: string; descripcion: string; toc: LegalTocItem[]; html: string };

const DIR = join(process.cwd(), "content/legal");
const frontMatter = z.object({ titulo: z.string(), etiqueta: z.string(), actualizado: z.string(), seo: z.string(), descripcion: z.string() });

const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" };
const decode = (s: string) => s.replace(/&(amp|quot|#39|lt|gt);/g, (m) => ENTITIES[m]);
const NUM = /^(\d+(?:\.\d+)?)\.?\s+(.+)$/;

export function getLegal(slug: LegalSlug): LegalDoc {
  const { data, content } = matter(readFileSync(join(DIR, `${slug}.md`), "utf8"));
  const fm = frontMatter.parse(data);
  const toc: LegalTocItem[] = [];
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const plain = decode(html.replace(/<[^>]+>/g, ""));
        const m = NUM.exec(plain);
        const n = m ? m[1] : null;
        const text = m ? m[2] : plain;
        const base = (depth === 2 ? "" : "sub-") + (slugifyHeading(text) || "seccion");
        let id = base;
        for (let i = 2; toc.some((t) => t.id === id) || id === "contenido"; i++) id = `${base}-${i}`;
        if (depth === 2) toc.push({ id, n, text });
        const label = m ? html.replace(/^\s*\d+(?:\.\d+)?\.?\s+/, "") : html;
        const num = n ? `<span class="vv-legal-num">${depth === 2 ? n.padStart(2, "0") : n}</span>` : "";
        return `<h${depth} id="${id}">${num}${label}</h${depth}>\n`;
      },
      // Tablas: se desplazan de lado en pantallas angostas.
      table(token) {
        const head = token.header.map((c) => `<th scope="col">${this.parser.parseInline(c.tokens)}</th>`).join("");
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`).join("");
        return `<div class="vv-table" role="region" tabindex="0" aria-label="Tabla"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  return { ...fm, toc, html: md.parse(content) as string };
}
