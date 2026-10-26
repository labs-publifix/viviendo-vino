"use server";

import { refresh } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { authClient, isLocked, LOCKED_MESSAGE, recordAttempt } from "@/lib/admin/auth";
import { passwordProblem } from "@/lib/admin/rules";
import { closeSessions, currentTokenHash, requireAdmin, type AdminUser } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Mi cuenta: nombre, contraseña, código en dos pasos (TOTP) y sesiones. Toda acción sensible pide la
// contraseña actual y respeta el mismo bloqueo por intentos fallidos que el inicio de sesión.

export type CuentaState = { ok?: boolean; message?: string; error?: string; field?: string };
export type TotpState = CuentaState & { step?: "qr"; factorId?: string; qr?: string; secret?: string };

const WRONG_PASSWORD = "Tu contraseña actual no es correcta.";
const WRONG_CODE = "El código no es correcto o ya venció. Escribe el que aparece ahora en tu app.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Verifica la contraseña actual y devuelve el cliente con esa sesión (solo vive durante esta acción). */
async function verifyPassword(user: AdminUser, password: string) {
  if (await isLocked(user.email)) return { error: LOCKED_MESSAGE } as const;
  const sb = authClient();
  const { data, error } = await sb.auth.signInWithPassword({ email: user.email, password });
  if (error || !data.user || (user.userId && data.user.id !== user.userId)) {
    await recordAttempt(user.email, false);
    return { error: WRONG_PASSWORD } as const;
  }
  return { sb, authId: data.user.id } as const;
}

export async function guardarNombre(_prev: CuentaState, form: FormData): Promise<CuentaState> {
  const user = await requireAdmin();
  const nombre = String(form.get("nombre") ?? "").replace(/\s+/g, " ").trim();
  if (nombre.length < 2 || nombre.length > 120) return { error: "Escribe tu nombre (de 2 a 120 caracteres).", field: "nombre" };
  if (nombre === user.nombre) return { ok: true, message: "Sin cambios." };
  const { error } = await supabaseAdmin().from("admin_usuarios").update({ nombre }).eq("id", user.id);
  if (error) return { error: "No se pudo guardar. Intenta otra vez." };
  await audit(user, "editar", "cuenta", user.id, { nombre: user.nombre }, { nombre });
  refresh();
  return { ok: true, message: "Listo, guardamos tu nombre." };
}

export async function cambiarContrasena(_prev: CuentaState, form: FormData): Promise<CuentaState> {
  const user = await requireAdmin();
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!actual) return { error: "Escribe tu contraseña actual.", field: "actual" };
  const problem = passwordProblem(nueva, user.email);
  if (problem) return { error: problem, field: "nueva" };
  if (nueva === actual) return { error: "Usa una contraseña distinta a la actual.", field: "nueva" };
  if (nueva !== confirm) return { error: "Las contraseñas no coinciden.", field: "confirm" };

  const v = await verifyPassword(user, actual);
  if ("error" in v) return { error: v.error, field: "actual" };
  const { error } = await supabaseAdmin().auth.admin.updateUserById(v.authId, { password: nueva });
  if (error) {
    console.error("admin/cuenta: no se cambió la contraseña", user.id, error.code);
    return { error: "No pudimos cambiar tu contraseña. Intenta otra vez." };
  }
  await recordAttempt(user.email, true);
  // Por seguridad, cambiar la contraseña cierra las demás sesiones abiertas.
  await closeSessions(user.id, await currentTokenHash());
  await audit(user, "cambiar_contrasena", "cuenta", user.id);
  return { ok: true, message: "Listo, tu contraseña cambió. Cerramos tus sesiones en otros dispositivos." };
}

export async function iniciar2fa(_prev: TotpState, form: FormData): Promise<TotpState> {
  const user = await requireAdmin();
  const v = await verifyPassword(user, String(form.get("password") ?? ""));
  if ("error" in v) return { error: v.error, field: "password" };
  // Si quedó un intento a medias (factor sin verificar), se limpia antes de empezar.
  const admin = supabaseAdmin().auth.admin.mfa;
  const { data: list } = await admin.listFactors({ userId: v.authId });
  for (const f of list?.factors ?? []) if (f.status !== "verified") await admin.deleteFactor({ userId: v.authId, id: f.id });
  if ((list?.factors ?? []).some((f) => f.status === "verified")) return { error: "Ya tienes el código en dos pasos activado." };

  const { data, error } = await v.sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Viviendo Vino", issuer: "Viviendo Vino" });
  if (error || !data || data.type !== "totp") {
    console.error("admin/cuenta: no se pudo iniciar el código en dos pasos", user.id, error?.code);
    return { error: "No pudimos iniciar la activación. Intenta otra vez." };
  }
  return { step: "qr", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmar2fa(_prev: TotpState, form: FormData): Promise<TotpState> {
  const user = await requireAdmin();
  const factorId = String(form.get("factorId") ?? "");
  const code = String(form.get("codigo") ?? "").replace(/\s/g, "");
  const keep = { step: "qr" as const, factorId, qr: String(form.get("qr") ?? ""), secret: String(form.get("secret") ?? "") };
  if (!UUID.test(factorId)) return { error: "Empieza otra vez la activación." };
  if (!/^\d{6}$/.test(code)) return { ...keep, error: "El código tiene 6 dígitos.", field: "codigo" };
  const v = await verifyPassword(user, String(form.get("password") ?? ""));
  if ("error" in v) return { error: v.error };
  const { error } = await v.sb.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    await recordAttempt(user.email, false);
    return { ...keep, error: WRONG_CODE, field: "codigo" };
  }
  await audit(user, "activar_2fa", "cuenta", user.id);
  refresh();
  return { ok: true, message: "Listo. Desde ahora, al entrar te pediremos el código de tu app." };
}

export async function desactivar2fa(_prev: CuentaState, form: FormData): Promise<CuentaState> {
  const user = await requireAdmin();
  const code = String(form.get("codigo") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "El código tiene 6 dígitos.", field: "codigo" };
  const v = await verifyPassword(user, String(form.get("password") ?? ""));
  if ("error" in v) return { error: v.error, field: "password" };
  const { data } = await v.sb.auth.mfa.listFactors();
  const totp = data?.totp?.find((f) => f.status === "verified");
  if (!totp) return { ok: true, message: "El código en dos pasos ya estaba desactivado." };
  const { error } = await v.sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
  if (error) {
    await recordAttempt(user.email, false);
    return { error: WRONG_CODE, field: "codigo" };
  }
  const del = await supabaseAdmin().auth.admin.mfa.deleteFactor({ userId: v.authId, id: totp.id });
  if (del.error) return { error: "No pudimos desactivarlo. Intenta otra vez." };
  await audit(user, "desactivar_2fa", "cuenta", user.id);
  refresh();
  return { ok: true, message: "Desactivamos el código en dos pasos. Al entrar solo te pediremos tu contraseña." };
}

export async function cerrarOtrasSesiones(): Promise<CuentaState> {
  const user = await requireAdmin();
  try {
    await closeSessions(user.id, await currentTokenHash());
  } catch {
    return { error: "No se pudieron cerrar. Intenta otra vez." };
  }
  await audit(user, "cerrar_sesiones", "cuenta", user.id);
  refresh();
  return { ok: true, message: "Listo, cerramos tus sesiones en otros dispositivos." };
}
