"use server";

import { refresh } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { validarTransferencia } from "@/lib/admin/pedidos-rules";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Finanzas: registrar y borrar transferencias al aliado. Es dinero: solo un administrador, y todo queda en la
// auditoría. El aliado ve sus transferencias en solo lectura.

export type TransferenciaState = { ok?: boolean; message?: string; error?: string; errors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVE_ERROR = "No se pudo guardar. Intenta otra vez.";
const hoyCdmx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

export async function registrarTransferencia(_prev: TransferenciaState, form: FormData): Promise<TransferenciaState> {
  const user = await requireAdmin(["admin"]);
  const aliadoId = String(form.get("aliado_id") ?? "");
  if (!UUID.test(aliadoId)) return { error: SAVE_ERROR };
  const v = validarTransferencia(
    { monto: String(form.get("monto") ?? ""), fecha: String(form.get("fecha") ?? ""), referencia: String(form.get("referencia") ?? ""), nota: String(form.get("nota") ?? "") },
    hoyCdmx(),
  );
  if (!v.ok) return { errors: v.errors };
  const db = supabaseAdmin();
  const { data: aliado } = await db.from("aliados").select("nombre").eq("id", aliadoId).maybeSingle();
  if (!aliado) return { error: "Ese aliado ya no existe. Recarga la página." };
  const { data, error } = await db
    .from("transferencias")
    .insert({ aliado_id: aliadoId, ...v.data, prueba: process.env.VERCEL_ENV !== "production", usuario_id: user.id })
    .select("id")
    .single();
  if (error) return { error: SAVE_ERROR };
  await audit(user, "crear", "transferencias", data.id, null, { aliado: aliado.nombre, ...v.data });
  refresh();
  return { ok: true, message: "Transferencia registrada." };
}

export async function borrarTransferencia(id: string): Promise<TransferenciaState> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id)) return { error: SAVE_ERROR };
  const db = supabaseAdmin();
  const { data: t } = await db.from("transferencias").select("id, aliado_id, fecha, monto_centavos, referencia, nota").eq("id", id).maybeSingle();
  if (!t) return { ok: true };
  const { data: aliado } = await db.from("aliados").select("nombre").eq("id", t.aliado_id).maybeSingle();
  const { error } = await db.from("transferencias").delete().eq("id", id);
  if (error) return { error: SAVE_ERROR };
  await audit(user, "eliminar", "transferencias", id, { aliado: aliado?.nombre ?? null, fecha: t.fecha, monto_centavos: t.monto_centavos, referencia: t.referencia, nota: t.nota }, null);
  refresh();
  return { ok: true, message: "Transferencia borrada." };
}
