// Backlog editorial del blog (content/blog/BACKLOG.md, sección 7 "Fichas por artículo") y su estado real.
// Puro: el panel le pasa el texto del backlog, los archivos que existen y la hora; aquí se cruza todo.

export type FichaBacklog = {
  numero: string;
  titulo: string;
  fecha: string | null; // AAAA-MM-DD
  tipo: string;
  categoria: string;
  cluster: string;
  estadoBacklog: string;
  slug: string | null;
  keyword: string;
  cta: string;
};

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

/** "19 de noviembre de 2026 (jueves, 9:00 am CDMX)" → "2026-11-19". */
export function fechaDeTexto(texto: string): string | null {
  const m = /(\d{1,2}) de ([a-záéíóú]+) de (\d{4})/i.exec(texto);
  const mes = m && MESES[m[2].toLowerCase()];
  return m && mes ? `${m[3]}-${mes}-${m[1].padStart(2, "0")}` : null;
}

export function parseBacklog(md: string): FichaBacklog[] {
  const start = md.indexOf("## 7.");
  if (start < 0) return [];
  const end = md.indexOf("\n## ", start + 5);
  const section = md.slice(start, end < 0 ? undefined : end);
  return section
    .split(/\n### /)
    .slice(1)
    .flatMap((block) => {
      const head = /^(\d{1,3})\s*·\s*(.+)$/m.exec(block);
      if (!head) return [];
      const campos = new Map<string, string>();
      for (const line of block.split("\n")) {
        const c = /^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
        if (c && c[1] !== "Campo" && !/^-+$/.test(c[1])) campos.set(c[1], c[2]);
      }
      const slug = (campos.get("Slug") ?? "").replace(/`/g, "").trim();
      return [
        {
          numero: head[1].padStart(2, "0"),
          titulo: head[2].trim(),
          fecha: fechaDeTexto(campos.get("Fecha de publicación") ?? ""),
          tipo: (campos.get("Tipo") ?? "").replace(/\s*[(·].*$/, ""),
          categoria: campos.get("Categoría") ?? "",
          cluster: campos.get("Clúster") ?? "",
          estadoBacklog: campos.get("Estado") ?? "",
          slug: slug || null,
          keyword: campos.get("Keyword principal") ?? "",
          cta: campos.get("CTA") ?? "",
        },
      ];
    });
}

export type EstadoBlog = "publicado" | "listo" | "programado" | "borrador" | "atrasado" | "por-redactar" | "idea";
export const ESTADO_BLOG: Record<EstadoBlog, { label: string; tono: "ok" | "accent" | "aviso" | "muted" | "error" }> = {
  publicado: { label: "Publicado", tono: "ok" },
  listo: { label: "Listo · sale con la apertura", tono: "ok" },
  programado: { label: "Programado", tono: "accent" },
  borrador: { label: "En redacción", tono: "aviso" },
  atrasado: { label: "Atrasado", tono: "error" },
  "por-redactar": { label: "Por redactar esta semana", tono: "aviso" },
  idea: { label: "Idea aprobada", tono: "muted" },
};

type Archivo = { slug: string; fecha: string; publicado: boolean };

/**
 * Estado real de una ficha: manda el archivo si existe (publicado, programado o borrador); si no existe, la
 * fecha dice si ya debería estar escrito. Antes de la apertura de la tienda lo publicado se ve solo en dev.
 */
export function estadoFicha(f: Pick<FichaBacklog, "fecha" | "slug">, archivo: Archivo | undefined, now: number, aperturaMs: number): EstadoBlog {
  const sale = (fecha: string) => Date.parse(`${fecha}T15:00:00Z`); // 9:00 am CDMX, igual que la tienda
  if (archivo) {
    if (!archivo.publicado) return "borrador";
    if (sale(archivo.fecha) > now) return "programado";
    return now < aperturaMs ? "listo" : "publicado";
  }
  if (f.fecha) {
    const falta = sale(f.fecha) - now;
    if (falta <= 0) return "atrasado";
    if (falta <= 7 * 24 * 3600 * 1000) return "por-redactar";
  }
  return "idea";
}
