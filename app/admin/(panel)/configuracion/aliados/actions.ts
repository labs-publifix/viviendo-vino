"use server";

import { refresh, updateTag } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { slugify, validarAliado, type AliadoInput } from "@/lib/admin/catalogo-rules";
import { PAGINAS_CATALOGO, refrescarTienda } from "@/lib/admin/refrescar-tienda";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Configuración → Aliados (solo admin): alta y edición del aliado (empresa, comisión, condiciones y datos
// privados) y pausa. La comisión es dinero: solo un administrador la cambia, y queda en la auditoría.

export type AliadoState = { ok?: boolean; message?: string; error?: string; errors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS = ["nombre", "ciudad", "estado", "comision", "plazo_dias", "plazo_texto", "razon_social", "rfc", "contacto_nombre", "contacto_telefono", "contacto_email", "clabe", "notas"] as const;
/** En la auditoría la CLABE se guarda enmascarada. */
const enmascarar = (o: Record<string, unknown>) => ({ ...o, clabe: typeof o.clabe === "string" && o.clabe ? `•••• ${o.clabe.slice(-4)}` : o.clabe ?? null });

async function leer(id: string) {
  const db = supabaseAdmin();
  const [a, c, d] = await Promise.all([
    db.from("aliados").select("id, slug, nombre, ciudad, estado, comision_bps, activo").eq("id", id).maybeSingle(),
    db.from("configuracion_comercial").select("plazo_preparacion_dias, plazo_entrega_texto").eq("aliado_id", id).maybeSingle(),
    db.from("aliados_datos").select("razon_social, rfc, contacto_nombre, contacto_telefono, contacto_email, clabe, notas").eq("aliado_id", id).maybeSingle(),
  ]);
  return a.data ? { ...a.data, ...(c.data ?? {}), ...(d.data ?? {}) } : null;
}

export async function guardarAliado(_prev: AliadoState, form: FormData): Promise<AliadoState> {
  const user = await requireAdmin(["admin"]);
  const id = String(form.get("id") ?? "");
  if (id && !UUID.test(id)) return { error: "No se pudo guardar. Recarga la página." };
  const input = Object.fromEntries(CAMPOS.map((k) => [k, String(form.get(k) ?? "")])) as AliadoInput;
  const v = validarAliado(input);
  if (!v.ok) return { errors: v.errors };
  const { privados, plazo_preparacion_dias, plazo_entrega_texto, ...empresa } = v.data;
  const db = supabaseAdmin();
  const ahora = new Date().toISOString();

  try {
    if (id) {
      const antes = await leer(id);
      if (!antes) return { error: "Ese aliado ya no existe. Recarga la página." };
      const r1 = await db.from("aliados").update(empresa).eq("id", id);
      if (r1.error) throw new Error(r1.error.code);
      const r2 = await db.from("configuracion_comercial").upsert({ aliado_id: id, plazo_preparacion_dias, plazo_entrega_texto, updated_at: ahora });
      if (r2.error) throw new Error(r2.error.code);
      const r3 = await db.from("aliados_datos").upsert({ aliado_id: id, ...privados, updated_at: ahora });
      if (r3.error) throw new Error(r3.error.code);
      await audit(user, "editar", "aliados", id, enmascarar(antes), enmascarar({ ...empresa, plazo_preparacion_dias, plazo_entrega_texto, ...privados }));
    } else {
      // Slug interno único a partir del nombre (no se muestra en la tienda).
      const base = slugify(empresa.nombre) || "aliado";
      const { data: existentes } = await db.from("aliados").select("slug");
      const usados = new Set((existentes ?? []).map((x) => x.slug as string));
      let slug = base;
      for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
      const { data, error } = await db.from("aliados").insert({ ...empresa, slug, activo: true }).select("id").single();
      if (error) throw new Error(error.code);
      const r2 = await db.from("configuracion_comercial").insert({ aliado_id: data.id, plazo_preparacion_dias, plazo_entrega_texto });
      if (r2.error) throw new Error(r2.error.code);
      const r3 = await db.from("aliados_datos").insert({ aliado_id: data.id, ...privados });
      if (r3.error) throw new Error(r3.error.code);
      await audit(user, "crear", "aliados", data.id, null, enmascarar({ ...empresa, plazo_preparacion_dias, plazo_entrega_texto, ...privados }));
    }
  } catch (e) {
    console.error("admin/aliados: no se guardó", (e as Error).message);
    return { error: "No se pudo guardar. Intenta otra vez." };
  }
  updateTag("catalogo");
  refresh();
  return { ok: true, message: id ? "Cambios guardados." : `Listo, ${empresa.nombre} ya es aliado. Ahora agrega sus vinos en Catálogo e invita a su gente en Equipo.` };
}

export async function pausarAliado(id: string, activo: boolean): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id)) return { error: "No se pudo guardar. Recarga la página." };
  const db = supabaseAdmin();
  const { data: a } = await db.from("aliados").select("nombre, activo").eq("id", id).maybeSingle();
  if (!a) return { error: "Ese aliado ya no existe." };
  const { error } = await db.from("aliados").update({ activo }).eq("id", id);
  if (error) return { error: "No se pudo guardar. Intenta otra vez." };
  await audit(user, activo ? "reactivar" : "pausar", "aliados", id, { nombre: a.nombre, activo: a.activo }, { nombre: a.nombre, activo });
  // Pausado, sus grupos y vinos dejan de verse en la tienda.
  updateTag("catalogo");
  refrescarTienda(PAGINAS_CATALOGO);
  refresh();
  return { ok: true };
}
