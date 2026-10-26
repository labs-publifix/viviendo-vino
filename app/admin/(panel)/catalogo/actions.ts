"use server";

import { refresh, updateTag } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { puedeCambiarDisponible, slugify, validarKit, validarVino, type KitLinea, type VinoInput } from "@/lib/admin/catalogo-rules";
import { PAGINAS_CATALOGO, refrescarTienda } from "@/lib/admin/refrescar-tienda";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Catálogo. Regla de oro (docs/ADMIN.md): todo lo que toca precios, textos, fotos o kits solo lo hace un
// administrador (requireAdmin(["admin"]) en cada acción). El rol Aliado solo cambia sus vinos entre disponible
// y agotado (cambiarDisponible revisa que el vino sea suyo). Cada cambio refresca la tienda y queda auditado.

export type VinoState = { ok?: boolean; message?: string; error?: string; errors?: Record<string, string>; id?: string };
export type KitState = { ok?: boolean; message?: string; error?: string; errors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVE_ERROR = "No se pudo guardar. Intenta otra vez.";
const FOTO_MAX = 1.5 * 1024 * 1024;
const VINO_COLS =
  "id, aliado_id, slug, nombre_oficial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, volumen_ml, grado_alcohol, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, disponible, activo";

function done(paginas: string[] = []) {
  updateTag("catalogo");
  refrescarTienda([...PAGINAS_CATALOGO, ...paginas]);
  refresh();
}

async function slugLibre(tabla: "productos" | "kits_prearmados", base: string) {
  const { data } = await supabaseAdmin().from(tabla).select("slug");
  const usados = new Set((data ?? []).map((x) => x.slug as string));
  let slug = base || "nuevo";
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Tipo real de la foto por sus primeros bytes (no por lo que diga el navegador). */
function tipoFoto(buf: Uint8Array): { ext: string; type: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", type: "image/png" };
  if (String.fromCharCode(...buf.slice(0, 4)) === "RIFF" && String.fromCharCode(...buf.slice(8, 12)) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

async function subirFoto(file: File, slug: string): Promise<string | { error: string }> {
  if (file.size > FOTO_MAX) return { error: "La foto pesa demasiado. Usa una de menos de 1.5 MB." };
  const buf = new Uint8Array(await file.arrayBuffer());
  const tipo = tipoFoto(buf);
  if (!tipo) return { error: "La foto tiene que ser JPG, PNG o WebP." };
  const path = `${slug}-${Date.now()}.${tipo.ext}`;
  const storage = supabaseAdmin().storage.from("vinos");
  const { error } = await storage.upload(path, buf, { contentType: tipo.type, upsert: false, cacheControl: "31536000" });
  if (error) {
    console.error("admin/catalogo: no se subió la foto", error.message);
    return { error: "No se pudo subir la foto. Intenta otra vez." };
  }
  return storage.getPublicUrl(path).data.publicUrl;
}

// ---------- Disponible / agotado (admin y aliado, solo lo suyo) ----------

export async function cambiarDisponible(id: string, disponible: boolean): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireAdmin(["admin", "aliado"]);
  if (!UUID.test(id)) return { error: SAVE_ERROR };
  const db = supabaseAdmin();
  const { data: vino } = await db.from("productos").select("id, aliado_id, slug, nombre_oficial, disponible").eq("id", id).maybeSingle();
  if (!vino || !puedeCambiarDisponible(user, { aliadoId: vino.aliado_id })) return { error: "No puedes cambiar ese vino." };
  if (vino.disponible === disponible) return { ok: true };
  // Solo esta columna: así, aunque llegue algo más en la petición, nada más cambia.
  const { error } = await db.from("productos").update({ disponible }).eq("id", id);
  if (error) return { error: SAVE_ERROR };
  await audit(user, disponible ? "disponible" : "agotado", "productos", id, { nombre_oficial: vino.nombre_oficial, disponible: vino.disponible }, { nombre_oficial: vino.nombre_oficial, disponible });
  done([`/vinos/${vino.slug}`]);
  return { ok: true };
}

// ---------- Vino (solo admin) ----------

const CAMPOS_VINO = ["nombre_oficial", "productor", "categoria_slug", "grupo_id", "tipo", "uva", "region", "denominacion", "anada", "volumen_ml", "grado_alcohol", "precio", "premio", "descripcion", "descripcion_aliado"] as const;

export async function guardarVino(_prev: VinoState, form: FormData): Promise<VinoState> {
  const user = await requireAdmin(["admin"]);
  const db = supabaseAdmin();
  const id = String(form.get("id") ?? "");
  if (id && !UUID.test(id)) return { error: SAVE_ERROR };

  const antes = id ? (await db.from("productos").select(VINO_COLS).eq("id", id).maybeSingle()).data : null;
  if (id && !antes) return { error: "Ese vino ya no existe. Recarga la página." };
  const aliadoId = antes?.aliado_id ?? String(form.get("aliado_id") ?? "");
  if (!UUID.test(aliadoId)) return { errors: { aliado_id: "Elige el aliado." } };

  const [cats, grupos] = await Promise.all([db.from("categorias").select("slug"), db.from("grupos_botella").select("id").eq("aliado_id", aliadoId)]);
  const input = Object.fromEntries(CAMPOS_VINO.map((k) => [k, String(form.get(k) ?? "")])) as VinoInput;
  const v = validarVino(input, { categorias: (cats.data ?? []).map((c) => c.slug), grupos: (grupos.data ?? []).map((g) => g.id) });
  if (!v.ok) return { errors: v.errors };
  const activo = form.get("activo") === "on";

  // Un vino que está en un kit prearmado no cambia de grupo (el kit quedaría mezclado).
  if (antes && antes.grupo_id !== v.data.grupo_id) {
    const { data: enKits } = await db.from("kits_prearmados_items").select("kit_id").eq("producto_id", id);
    if (enKits?.length) return { errors: { grupo_id: "Este vino está en un kit prearmado. Quítalo del kit antes de cambiarlo de grupo." } };
  }

  const slug = antes?.slug ?? (await slugLibre("productos", slugify(v.data.nombre_oficial)));
  let imagen_url: string | undefined;
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const r = await subirFoto(foto, slug);
    if (typeof r !== "string") return { errors: { foto: r.error } };
    imagen_url = r;
  }

  const fila = { ...v.data, activo, ...(imagen_url ? { imagen_url } : {}) };
  let nuevoId = id;
  if (id) {
    const { error } = await db.from("productos").update(fila).eq("id", id);
    if (error) {
      console.error("admin/catalogo: no se guardó el vino", error.code);
      return { error: SAVE_ERROR };
    }
    await audit(user, "editar", "productos", id, antes, { ...antes, ...fila });
  } else {
    const { data: max } = await db.from("productos").select("orden").order("orden", { ascending: false }).limit(1);
    const orden = ((max?.[0]?.orden as number | undefined) ?? 0) + 1;
    const { data, error } = await db
      .from("productos")
      .insert({ ...fila, aliado_id: aliadoId, slug, orden, disponible: true, modo_venta: "kit" })
      .select("id")
      .single();
    if (error) {
      console.error("admin/catalogo: no se creó el vino", error.code);
      return { error: SAVE_ERROR };
    }
    nuevoId = data.id;
    await audit(user, "crear", "productos", data.id, null, { ...fila, slug });
  }
  done([`/vinos/${slug}`]);
  return { ok: true, id: nuevoId, message: id ? "Cambios guardados. Ya se ven en la tienda." : "Vino agregado. Ya se ve en la tienda." };
}

// ---------- Kit prearmado (solo admin) ----------

export async function guardarKit(_prev: KitState, form: FormData): Promise<KitState> {
  const user = await requireAdmin(["admin"]);
  const db = supabaseAdmin();
  const id = String(form.get("id") ?? "");
  if (id && !UUID.test(id)) return { error: SAVE_ERROR };
  const nombre = String(form.get("nombre") ?? "").replace(/\s+/g, " ").trim();
  const descripcion = String(form.get("descripcion") ?? "").trim();
  const activo = form.get("activo") === "on";
  const errors: Record<string, string> = {};
  if (nombre.length < 3 || nombre.length > 80) errors.nombre = "Escribe el nombre del kit.";
  if (descripcion.length > 300) errors.descripcion = "Usa máximo 300 caracteres.";
  let lineas: KitLinea[] = [];
  try {
    lineas = (JSON.parse(String(form.get("items") ?? "[]")) as KitLinea[]).map((l) => ({ productoId: String(l.productoId), cantidad: Number(l.cantidad) }));
  } catch {
    errors.items = "Revisa las botellas del kit.";
  }
  if (Object.keys(errors).length) return { errors };

  const antes = id ? (await db.from("kits_prearmados").select("id, aliado_id, slug, nombre, descripcion, activo").eq("id", id).maybeSingle()).data : null;
  if (id && !antes) return { error: "Ese kit ya no existe. Recarga la página." };
  const aliadoId = antes?.aliado_id ?? String(form.get("aliado_id") ?? "");
  if (!UUID.test(aliadoId)) return { errors: { aliado_id: "Elige el aliado." } };

  const { data: vinos } = await db.from("productos").select("id, grupo_id, activo, aliado_id, nombre_oficial").eq("aliado_id", aliadoId);
  const problema = validarKit(
    lineas,
    (vinos ?? []).map((x) => ({ id: x.id, grupoId: x.grupo_id, activo: x.activo, aliadoId: x.aliado_id })),
    aliadoId,
  );
  if (problema) return { errors: { items: problema } };
  const nombreDe = new Map((vinos ?? []).map((x) => [x.id as string, x.nombre_oficial as string]));
  const limpias = lineas.filter((l) => l.cantidad > 0);
  const resumen = limpias.map((l) => `${l.cantidad}× ${nombreDe.get(l.productoId)}`).join(", ");
  const itemsAntes = id ? ((await db.from("kits_prearmados_items").select("producto_id, cantidad").eq("kit_id", id)).data ?? []).map((x) => `${x.cantidad}× ${nombreDe.get(x.producto_id)}`).join(", ") : null;

  let kitId = id;
  if (id) {
    const { error } = await db.from("kits_prearmados").update({ nombre, descripcion: descripcion || null, activo }).eq("id", id);
    if (error) return { error: SAVE_ERROR };
  } else {
    const slug = await slugLibre("kits_prearmados", slugify(nombre));
    const { data: max } = await db.from("kits_prearmados").select("orden").order("orden", { ascending: false }).limit(1);
    const { data, error } = await db
      .from("kits_prearmados")
      .insert({ aliado_id: aliadoId, slug, nombre, descripcion: descripcion || null, activo, orden: ((max?.[0]?.orden as number | undefined) ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { error: SAVE_ERROR };
    kitId = data.id;
  }
  // Las botellas se reemplazan en una sola transacción (la base vuelve a validar 6 del mismo grupo).
  const { error: e2 } = await db.rpc("admin_guardar_kit_items", { p_kit: kitId, p_items: limpias.map((l) => ({ producto_id: l.productoId, cantidad: l.cantidad })) });
  if (e2) {
    console.error("admin/catalogo: no se guardaron las botellas del kit", e2.code);
    if (!id) await db.from("kits_prearmados").delete().eq("id", kitId);
    return { error: "No se pudieron guardar las botellas del kit. Revisa que sean 6 del mismo grupo." };
  }
  await audit(
    user,
    id ? "editar" : "crear",
    "kits_prearmados",
    kitId,
    antes ? { nombre: antes.nombre, descripcion: antes.descripcion, activo: antes.activo, items: itemsAntes } : null,
    { nombre, descripcion: descripcion || null, activo, items: resumen },
  );
  done();
  return { ok: true, message: id ? "Kit guardado. Ya se ve en la tienda." : "Kit agregado. Ya se ve en la tienda." };
}
