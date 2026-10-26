import "server-only";
import { ESTADO_BLOG, estadoFicha, parseBacklog } from "@/lib/blog/backlog";
import { listArticleFiles, readBacklog } from "@/lib/blog/content";
import { LAUNCH_AT_MS } from "@/lib/launch";

// Blog en el panel: el backlog editorial (content/blog/BACKLOG.md) cruzado con los archivos que ya existen.
// Lo que no está en el backlog pero sí tiene archivo también aparece (marcado sin número).

const fechaFmt = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fechaLegible = (d: string | null) => (d ? fechaFmt.format(new Date(`${d}T12:00:00Z`)).replace(/\./g, "") : "");

export async function getBlogPanel() {
  const fichas = parseBacklog(readBacklog());
  const archivos = listArticleFiles().filter((a) => !a.ejemplo);
  const porSlug = new Map(archivos.map((a) => [a.slug, a]));
  const now = Date.now();
  const enBacklog = new Set(fichas.map((f) => f.slug));

  const rows = [
    ...fichas.map((f) => {
      const archivo = f.slug ? porSlug.get(f.slug) : undefined;
      const fecha = archivo?.fecha ?? f.fecha;
      const estado = estadoFicha(f, archivo, now, LAUNCH_AT_MS);
      return { f, archivo, fecha, estado, keyword: f.keyword };
    }),
    ...archivos
      .filter((a) => !enBacklog.has(a.slug))
      .map((a) => ({
        f: { numero: "—", titulo: a.titulo, tipo: a.tipo === "guia" ? "Guía" : "Artículo", categoria: a.categoria, slug: a.slug, fecha: a.fecha },
        archivo: a,
        fecha: a.fecha,
        estado: estadoFicha({ fecha: a.fecha, slug: a.slug }, a, now, LAUNCH_AT_MS),
        keyword: "",
      })),
  ].map(({ f, archivo, fecha, estado, keyword }) => ({
    id: f.slug ?? f.numero,
    numero: f.numero,
    titulo: f.titulo,
    // Solo se enlaza lo que ya tiene archivo (en dev se ven también los programados).
    tituloHref: archivo ? `/blog/${archivo.slug}` : "",
    slug: f.slug ?? "",
    tipo: f.tipo,
    categoria: f.categoria,
    fecha: fechaLegible(fecha),
    keyword,
    estado,
    estadoLabel: ESTADO_BLOG[estado].label,
    tono: ESTADO_BLOG[estado].tono,
    grupo: estado === "publicado" || estado === "listo" ? "listo" : estado === "programado" ? "programado" : "pendiente",
  }));

  const pendientes = rows.filter((r) => r.grupo === "pendiente");
  const siguiente = rows.find((r) => r.estado === "programado" || r.grupo === "pendiente");
  return {
    rows,
    resumen: {
      publicadas: rows.filter((r) => r.grupo === "listo").length,
      programadas: rows.filter((r) => r.grupo === "programado").length,
      pendientes: pendientes.length,
      atrasadas: rows.filter((r) => r.estado === "atrasado").length,
    },
    proxima: siguiente ? { numero: siguiente.numero, titulo: siguiente.titulo, fecha: siguiente.fecha } : null,
  };
}
