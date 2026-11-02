"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { audit } from "@/lib/admin/audit";
import { siteOrigin } from "@/lib/admin/invite";
import { requireAdmin } from "@/lib/admin/session";
import { avisarUmbrales } from "@/lib/inventario/avisos";
import { MOTIVO_LABEL, puedeAjustarInventario, validarCambio, validarFijar } from "@/lib/inventario/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Inventario desde el panel: admin (todos los vinos) y aliado (solo los suyos); atención solo consulta.
// El servidor revisa permisos en cada acción y la base hace el cambio con el vino bloqueado (ajustar_existencias),
// así un +1 del admin y un −1 del aliado al mismo tiempo cuentan los dos. Todo queda en el historial del vino, en
// la auditoría y, si baja a 3 o menos o a 0, se avisa por correo.

export type ExistenciasState = { ok?: boolean; error?: string; errors?: Record<string, string>; existencias?: number; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVE_ERROR = "No se pudo guardar. Intenta otra vez.";

async function vinoDe(id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await supabaseAdmin().from("productos").select("id, aliado_id, slug, nombre_oficial").eq("id", id).maybeSingle();
  return data;
}

async function despues(user: { id: string; email: string }, vino: { id: string; nombre_oficial: string }, antes: number, ahora: number, motivo: string, nota: string | null) {
  await audit(user, "inventario", "productos", vino.id, { nombre_oficial: vino.nombre_oficial, existencias: antes }, { nombre_oficial: vino.nombre_oficial, existencias: ahora, motivo: MOTIVO_LABEL[motivo] ?? motivo, ...(nota ? { nota } : {}) });
  updateTag("catalogo");
  const origen = await siteOrigin();
  after(() => avisarUmbrales([{ productoId: vino.id, antes, despues: ahora }], origen));
}

/** Botones − / + (los clics seguidos llegan juntos como un solo cambio, p. ej. +3). */
export async function ajustarExistencias(id: string, cambio: number): Promise<ExistenciasState> {
  const user = await requireAdmin(["admin", "aliado"]);
  const vino = await vinoDe(id);
  if (!vino || !puedeAjustarInventario(user, { aliadoId: vino.aliado_id })) return { error: "No puedes cambiar ese vino." };
  const c = validarCambio(cambio);
  if (c === null) return { error: SAVE_ERROR };
  const { data, error } = await supabaseAdmin().rpc("ajustar_existencias", {
    p_producto: id, p_cambio: c, p_fijar: null, p_esperado: null, p_motivo: "ajuste", p_nota: null, p_usuario_id: user.id, p_usuario_nombre: user.nombre,
  });
  if (error?.message === "existencias_invalidas") return { error: "Las existencias no pueden quedar en menos de 0.", existencias: Number(error.details) };
  if (error || !data) {
    console.error("admin/inventario: no se ajustaron las existencias", error?.code);
    return { error: SAVE_ERROR };
  }
  const r = data as { antes: number; despues: number };
  await despues(user, vino, r.antes, r.despues, "ajuste", null);
  return { ok: true, existencias: r.despues };
}

/** "Fijar en…": el número exacto (conteo físico), solo si nadie lo cambió desde que se leyó. */
export async function fijarExistencias(_prev: ExistenciasState, form: FormData): Promise<ExistenciasState> {
  const user = await requireAdmin(["admin", "aliado"]);
  const id = String(form.get("id") ?? "");
  const vino = await vinoDe(id);
  if (!vino || !puedeAjustarInventario(user, { aliadoId: vino.aliado_id })) return { error: "No puedes cambiar ese vino." };
  const v = validarFijar({ valor: String(form.get("valor") ?? ""), motivo: String(form.get("motivo") ?? ""), nota: String(form.get("nota") ?? "") });
  if (!v.ok) return { errors: v.errors };
  const esperado = Number(form.get("esperado"));
  const { data, error } = await supabaseAdmin().rpc("ajustar_existencias", {
    p_producto: id, p_cambio: null, p_fijar: v.data.valor, p_esperado: Number.isInteger(esperado) ? esperado : null, p_motivo: v.data.motivo, p_nota: v.data.nota, p_usuario_id: user.id, p_usuario_nombre: user.nombre,
  });
  if (error?.message === "cambio_concurrente") {
    refresh();
    return { error: `Alguien cambió las existencias mientras tanto: ahora hay ${error.details}. Revisa el número y vuelve a guardar.`, existencias: Number(error.details) };
  }
  if (error || !data) {
    console.error("admin/inventario: no se fijaron las existencias", error?.code);
    return { error: SAVE_ERROR };
  }
  const r = data as { antes: number; despues: number };
  if (r.antes !== r.despues) await despues(user, vino, r.antes, r.despues, v.data.motivo, v.data.nota);
  refresh();
  return { ok: true, existencias: r.despues, message: r.antes === r.despues ? "Sin cambios: ya tenía ese número." : `Listo: ${vino.nombre_oficial} quedó con ${r.despues} ${r.despues === 1 ? "botella" : "botellas"}.` };
}
