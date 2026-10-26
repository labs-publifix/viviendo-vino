"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { emailHash } from "@/lib/admin/auth";
import { sendAccessLink } from "@/lib/admin/invite";
import { equipoProblema, type Rol } from "@/lib/admin/rules";
import { closeSessions, requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Configuración → Equipo (solo admin): invitar, editar nombre y rol, quitar o devolver el acceso y reenviar el
// enlace para crear contraseña. Las reglas de qué se puede cambiar viven en lib/admin/rules.ts (equipoProblema).

export type EquipoState = { ok?: boolean; message?: string; error?: string; errors?: Record<string, string> };
export type ActionResult = { ok?: boolean; message?: string; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["admin", "atencion", "aliado"] as const;
const MAX_LINKS_PER_HOUR = 3;

const miembro = z.object({
  nombre: z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().min(2, "Escribe el nombre.").max(120, "Usa máximo 120 caracteres.")),
  rol: z.enum(ROLES, { message: "Elige un rol." }),
  aliado_id: z.string().optional(),
});

async function equipo() {
  const { data, error } = await supabaseAdmin().from("admin_usuarios").select("id, email, nombre, rol, aliado_id, user_id, activo");
  if (error) throw new Error(error.code);
  return (data ?? []) as { id: string; email: string; nombre: string; rol: Rol; aliado_id: string | null; user_id: string | null; activo: boolean }[];
}

async function aliadoValido(rol: Rol, aliadoId: string | undefined): Promise<string | null | "invalido"> {
  if (rol !== "aliado") return null;
  if (!aliadoId || !UUID.test(aliadoId)) return "invalido";
  const { data } = await supabaseAdmin().from("aliados").select("id").eq("id", aliadoId).maybeSingle();
  return data ? aliadoId : "invalido";
}

function fieldErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string> = {};
  for (const i of issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

export async function invitar(_prev: EquipoState, form: FormData): Promise<EquipoState> {
  const user = await requireAdmin(["admin"]);
  const parsed = miembro.extend({ email: z.string().trim().toLowerCase().email("Revisa el correo: por ejemplo nombre@correo.com.").max(254) }).safeParse({
    nombre: form.get("nombre") ?? "",
    email: form.get("email") ?? "",
    rol: form.get("rol") ?? "",
    aliado_id: form.get("aliado_id") || undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };
  const { nombre, email, rol } = parsed.data;
  const aliado = await aliadoValido(rol, parsed.data.aliado_id);
  if (aliado === "invalido") return { errors: { aliado_id: "Elige el aliado al que pertenece." } };

  const db = supabaseAdmin();
  const { data, error } = await db.from("admin_usuarios").insert({ email, nombre, rol, aliado_id: aliado }).select("id, email, nombre, user_id").single();
  if (error) {
    if (error.code === "23505") return { errors: { email: "Ese correo ya está en el equipo." } };
    console.error("admin/equipo: no se pudo invitar", error.code);
    return { error: "No se pudo guardar. Intenta otra vez." };
  }
  await audit(user, "invitar", "admin_usuarios", data.id, null, { nombre, email, rol, aliado_id: aliado });
  refresh();
  try {
    await sendAccessLink(data);
  } catch (err) {
    console.error("admin/equipo: no se envió la invitación", data.id, err instanceof Error ? err.message : err);
    return { ok: true, error: `${nombre} ya está en el equipo, pero el correo no salió. Usa "Reenviar enlace" en su fila.` };
  }
  return { ok: true, message: `Listo. Le enviamos a ${nombre} el enlace para crear su contraseña (vence en una hora).` };
}

export async function editarMiembro(_prev: EquipoState, form: FormData): Promise<EquipoState> {
  const user = await requireAdmin(["admin"]);
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { error: "No se pudo guardar. Recarga la página." };
  const parsed = miembro.safeParse({ nombre: form.get("nombre") ?? "", rol: form.get("rol") ?? "", aliado_id: form.get("aliado_id") || undefined });
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };
  const { nombre, rol } = parsed.data;
  const aliado = await aliadoValido(rol, parsed.data.aliado_id);
  if (aliado === "invalido") return { errors: { aliado_id: "Elige el aliado al que pertenece." } };

  try {
    const todos = await equipo();
    const problema = equipoProblema(todos, user.id, { id, rol });
    if (problema) return { error: problema };
    const antes = todos.find((m) => m.id === id)!;
    const { error } = await supabaseAdmin().from("admin_usuarios").update({ nombre, rol, aliado_id: aliado }).eq("id", id);
    if (error) throw new Error(error.code);
    await audit(user, "editar", "admin_usuarios", id, { nombre: antes.nombre, rol: antes.rol, aliado_id: antes.aliado_id }, { nombre, rol, aliado_id: aliado });
  } catch (e) {
    console.error("admin/equipo: no se pudo editar", (e as Error).message);
    return { error: "No se pudo guardar. Intenta otra vez." };
  }
  refresh();
  return { ok: true, message: "Cambios guardados." };
}

export async function cambiarAcceso(id: string, activo: boolean): Promise<ActionResult> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id)) return { error: "No se pudo guardar. Recarga la página." };
  try {
    const todos = await equipo();
    const problema = equipoProblema(todos, user.id, { id, activo });
    if (problema) return { error: problema };
    const m = todos.find((x) => x.id === id)!;
    const { error } = await supabaseAdmin().from("admin_usuarios").update({ activo }).eq("id", id);
    if (error) throw new Error(error.code);
    // Sin acceso, sus sesiones abiertas se cierran al momento.
    if (!activo) await closeSessions(id);
    await audit(user, activo ? "devolver_acceso" : "quitar_acceso", "admin_usuarios", id, { nombre: m.nombre, activo: !activo }, { nombre: m.nombre, activo });
  } catch (e) {
    console.error("admin/equipo: no se pudo cambiar el acceso", (e as Error).message);
    return { error: "No se pudo guardar. Intenta otra vez." };
  }
  refresh();
  return { ok: true };
}

export async function reenviarEnlace(id: string): Promise<ActionResult> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id)) return { error: "No se pudo enviar. Recarga la página." };
  const db = supabaseAdmin();
  const { data: m } = await db.from("admin_usuarios").select("id, email, nombre, user_id, activo").eq("id", id).maybeSingle();
  if (!m) return { error: "Esa persona ya no está en el equipo." };
  if (!m.activo) return { error: "Primero devuélvele el acceso." };
  // Mismo tope que "Olvidé mi contraseña": 3 enlaces por hora por correo.
  const key = emailHash(`enlace:${m.email}`);
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await db.from("admin_intentos").select("id", { count: "exact", head: true }).eq("email_hash", key).gte("created_at", since);
  if ((count ?? 0) >= MAX_LINKS_PER_HOUR) return { error: "Ya se enviaron 3 enlaces en la última hora. Espera un poco antes de mandar otro." };
  await db.from("admin_intentos").insert({ email_hash: key, exito: true });
  try {
    await sendAccessLink(m);
  } catch (err) {
    console.error("admin/equipo: no se reenvió el enlace", id, err instanceof Error ? err.message : err);
    return { error: "No pudimos enviar el correo. Intenta otra vez en un momento." };
  }
  await audit(user, "reenviar", "admin_usuarios", id, null, { nombre: m.nombre });
  return { ok: true, message: `Le enviamos a ${m.nombre} un enlace nuevo.` };
}
