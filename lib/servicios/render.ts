import "server-only";
import { Marked } from "marked";

// Texto de las páginas de servicios (Markdown en línea → HTML). Los enlaces externos se abren en otra pestaña con
// rel="noopener noreferrer" y avisan a lectores de pantalla; los internos (/wine-scan, /quiz, /blog) navegan normal.
const md = new Marked({ gfm: true });
md.use({
  renderer: {
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens);
      const externo = /^https?:\/\//.test(href);
      return externo
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}<span class="vv-sr-only"> (se abre en otra pestaña)</span></a>`
        : `<a href="${href}">${text}</a>`;
    },
  },
});

export const enLinea = (texto: string) => md.parseInline(texto) as string;
