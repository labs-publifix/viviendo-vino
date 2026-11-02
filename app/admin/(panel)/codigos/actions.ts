"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/session";
import { validarCodigo, type CodigoInput } from "@/lib/descuentos/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Códigos de descuento (solo admin). El servidor valida todo; un código que ya se usó no cambia su tipo ni su valor
// (las cuentas de esos pedidos quedarían raras): para otro valor, se duplica. Todo queda en la Auditoría.

export type CodigoState = { ok?: boolean; message?: string; error?: string; errors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVE_ERROR = "No se pudo guardar. Intenta otra vez.";
const CAMPOS = ["codigo", "descripcion", "texto_publico", "tipo", "valor", "tope", "inicia", "termina", "usos_max", "usos_por_cliente", "min_kits"] as const;

export async function guardarCodigo(_prev: CodigoState, form: FormData): Promise<CodigoState> {
  const user = await requireAdmin(["admin"]);
  const db = supabaseAdmin();
  const id = String(form.get("id") ?? "");
  if (id && !UUID.test(id)) return { error: SAVE_ERROR };
  const antes = id ? (await db.from("codigos_descuento").select("*").eq("id", id).maybeSingle()).data : null;
  if (id && !antes) return { error: "Ese código ya no existe. Recarga la página." };

  const input = Object.fromEntries(CAMPOS.map((k) => [k, String(form.get(k) ?? "")])) as Omit<CodigoInput, "solo_primera_compra">;
  // El código no cambia una vez creado (puede estar en enlaces y en pedidos).
  if (antes) input.codigo = antes.codigo;
  const v = validarCodigo({ ...input, solo_primera_compra: form.get("solo_primera_compra") === "on" }, Date.now());
  if (!v.ok) return { errors: v.errors };
  const activo = form.get("activo") === "on";
  const fila = { ...v.data, activo, updated_at: new Date().toISOString() };

  if (antes) {
    const { count } = await db.from("pedidos").select("id", { count: "exact", head: true }).eq("codigo_id", id);
    const usado = (count ?? 0) > 0;
    if (usado && (fila.tipo !== antes.tipo || fila.valor !== antes.valor || (fila.tope_centavos ?? null) !== (antes.tope_centavos ?? null))) {
      return { errors: { valor: "Este código ya se usó: no puedes cambiar el tipo, el valor ni el tope. Duplícalo para crear otro." } };
    }
    const { error } = await db.from("codigos_descuento").update(fila).eq("id", id);
    if (error) {
      console.error("admin/codigos: no se guardó el código", error.code);
      return { error: SAVE_ERROR };
    }
    await audit(user, "editar", "codigos_descuento", id, antes, { ...antes, ...fila });
    refresh();
    return { ok: true, message: "Cambios guardados." };
  }

  const { data, error } = await db
    .from("codigos_descuento")
    .insert({ ...fila, creado_por: user.id, creado_por_nombre: user.nombre })
    .select("id")
    .single();
  if (error?.code === "23505") return { errors: { codigo: "Ya existe un código con ese nombre. Elige otro." } };
  if (error || !data) {
    console.error("admin/codigos: no se creó el código", error?.code);
    return { error: SAVE_ERROR };
  }
  await audit(user, "crear", "codigos_descuento", data.id, null, fila);
  redirect(`/admin/codigos/${data.id}?aviso=creado`);
}

/** Pausar o reactivar un código (desde su ficha). */
export async function cambiarActivoCodigo(id: string, activo: boolean): Promise<CodigoState> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id)) return { error: SAVE_ERROR };
  const db = supabaseAdmin();
  const { data: c } = await db.from("codigos_descuento").select("id, codigo, activo").eq("id", id).maybeSingle();
  if (!c) return { error: "Ese código ya no existe." };
  const { error } = await db.from("codigos_descuento").update({ activo, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: SAVE_ERROR };
  await audit(user, activo ? "reactivar" : "pausar", "codigos_descuento", id, { codigo: c.codigo, activo: c.activo }, { codigo: c.codigo, activo });
  refresh();
  return { ok: true, message: activo ? `${c.codigo} está activo otra vez.` : `${c.codigo} quedó en pausa: ya no se puede usar.` };
}
