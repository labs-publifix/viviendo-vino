import "server-only";
import { KIT_IMAGES } from "@/lib/catalog/media";
import { GROUP_LABELS, type BottleGroup } from "@/lib/catalog/types";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AdminUser } from "./session";

// Catálogo en el panel: lee con la secret key todo lo que la tienda no ve (vinos ocultos, texto del aliado).
// El rol Aliado solo recibe sus propios vinos.

export type VinoPanel = {
  id: string;
  aliadoId: string;
  aliado: string;
  slug: string;
  nombre: string;
  productor: string;
  categoria: string;
  categoriaSlug: string;
  grupoId: string;
  grupo: string;
  tipo: string;
  uva: string;
  region: string;
  denominacion: string;
  anada: string;
  volumen: string;
  grado: string;
  precioCentavos: number;
  precioAntesCentavos: number | null;
  premio: string;
  descripcion: string;
  descripcionAliado: string;
  imagen: string | null;
  disponible: boolean;
  activo: boolean;
  kits: string[];
};
export type GrupoPanel = { id: string; aliadoId: string; codigo: string; nombre: string; descripcion: string; soloCaja: boolean; orden: number };
export type KitPanel = {
  id: string;
  aliadoId: string;
  slug: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  orden: number;
  /** Foto que ve la tienda: la subida desde el panel o, si no hay, la original del código. */
  imagen: string | null;
  items: { productoId: string; cantidad: number }[];
};

/** Nombre del grupo como lo ve la tienda (los cuatro de hoy usan su nombre editorial fijo). */
export const nombreGrupo = (codigo: string, nombre: string) => GROUP_LABELS[codigo as BottleGroup] ?? nombre;

function check<T>(r: { data: T[] | null; error: { code?: string } | null }, what: string): T[] {
  if (r.error) {
    console.error(`admin/catalogo: no se pudo leer ${what}`, r.error.code);
    throw new Error(`No se pudo leer ${what}.`);
  }
  return r.data ?? [];
}

export async function getCatalogoPanel(user: AdminUser) {
  const db = supabaseAdmin();
  const soloSuyos = user.rol === "aliado";
  if (soloSuyos && !user.aliadoId) return { vinos: [], grupos: [], categorias: [], kits: [], aliados: [] };

  let qp = db
    .from("productos")
    .select("id, aliado_id, slug, nombre_oficial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, volumen_ml, grado_alcohol, precio_centavos, precio_antes_centavos, premio, descripcion, descripcion_aliado, imagen_url, disponible, activo, orden")
    .order("orden");
  let qg = db.from("grupos_botella").select("id, aliado_id, codigo, nombre, descripcion, solo_caja_completa, orden").order("orden");
  let qk = db.from("kits_prearmados").select("id, aliado_id, slug, nombre, descripcion, activo, orden, imagen_url").order("orden");
  let qa = db.from("aliados").select("id, nombre, activo").order("nombre");
  if (soloSuyos) {
    qp = qp.eq("aliado_id", user.aliadoId!);
    qg = qg.eq("aliado_id", user.aliadoId!);
    qk = qk.eq("aliado_id", user.aliadoId!);
    qa = qa.eq("id", user.aliadoId!);
  }
  const [p, g, c, k, i, a] = await Promise.all([qp, qg, db.from("categorias").select("slug, nombre, orden").order("orden"), qk, db.from("kits_prearmados_items").select("kit_id, producto_id, cantidad"), qa]);
  const productos = check(p, "los vinos");
  const grupos = check(g, "los grupos");
  const categorias = check(c, "las categorías");
  const kitsRows = check(k, "los kits");
  const items = check(i, "las botellas de los kits");
  const aliados = check(a, "los aliados");

  const aliadoNombre = new Map(aliados.map((x) => [x.id as string, x.nombre as string]));
  const grupoPorId = new Map(grupos.map((x) => [x.id as string, x]));
  const catNombre = new Map(categorias.map((x) => [x.slug as string, x.nombre as string]));
  const kitNombre = new Map(kitsRows.map((x) => [x.id as string, x.nombre as string]));
  const kitsDe = new Map<string, string[]>();
  for (const it of items) if (kitNombre.has(it.kit_id)) kitsDe.set(it.producto_id, [...(kitsDe.get(it.producto_id) ?? []), kitNombre.get(it.kit_id)!]);
  const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  const vinos: VinoPanel[] = productos.map((x) => {
    const gr = grupoPorId.get(x.grupo_id);
    return {
      id: x.id,
      aliadoId: x.aliado_id,
      aliado: aliadoNombre.get(x.aliado_id) ?? "",
      slug: x.slug,
      nombre: x.nombre_oficial,
      productor: x.productor,
      categoria: catNombre.get(x.categoria_slug) ?? x.categoria_slug,
      categoriaSlug: x.categoria_slug,
      grupoId: x.grupo_id,
      grupo: gr ? nombreGrupo(gr.codigo, gr.nombre) : "",
      tipo: x.tipo,
      uva: txt(x.uva),
      region: txt(x.region),
      denominacion: txt(x.denominacion),
      anada: txt(x.anada),
      volumen: txt(x.volumen_ml),
      grado: txt(x.grado_alcohol),
      precioCentavos: x.precio_centavos,
      precioAntesCentavos: x.precio_antes_centavos ?? null,
      premio: txt(x.premio),
      descripcion: x.descripcion,
      descripcionAliado: soloSuyos ? "" : txt(x.descripcion_aliado),
      imagen: x.imagen_url ?? null,
      disponible: x.disponible,
      activo: x.activo,
      kits: kitsDe.get(x.id) ?? [],
    };
  });
  return {
    vinos,
    grupos: grupos.map((x) => ({ id: x.id, aliadoId: x.aliado_id, codigo: x.codigo, nombre: nombreGrupo(x.codigo, x.nombre), descripcion: txt(x.descripcion), soloCaja: x.solo_caja_completa, orden: x.orden })) as GrupoPanel[],
    categorias: categorias.map((x) => ({ slug: x.slug as string, nombre: x.nombre as string })),
    kits: kitsRows.map((x) => ({
      id: x.id,
      aliadoId: x.aliado_id,
      slug: x.slug,
      nombre: x.nombre,
      descripcion: txt(x.descripcion),
      activo: x.activo,
      orden: x.orden,
      imagen: (x.imagen_url as string | null) ?? KIT_IMAGES[x.slug as string] ?? null,
      items: items.filter((it) => it.kit_id === x.id).map((it) => ({ productoId: it.producto_id, cantidad: it.cantidad })),
    })) as KitPanel[],
    aliados: aliados.map((x) => ({ id: x.id as string, nombre: x.nombre as string })),
  };
}
