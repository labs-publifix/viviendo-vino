import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Sesión del panel: cookie propia vv_admin (httpOnly) con un token aleatorio. En la base solo vive su hash
// (admin_sesiones), así que cerrar sesión o desactivar a una persona la corta de inmediato.
// Ningún token de Supabase Auth llega al navegador.

export const ADMIN_COOKIE = ADMIN_COOKIE_NAME;
const SESSION_HOURS = 12;

export type { Rol } from "./rules";
import { ADMIN_COOKIE_NAME, type Rol } from "./rules";
export type AdminUser = { id: string; email: string; nombre: string; rol: Rol; aliadoId: string | null; userId: string | null };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea la sesión y pone la cookie. Solo desde una server action o un route handler. */
export async function startSession(usuarioId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  const db = supabaseAdmin();
  const { error } = await db.from("admin_sesiones").insert({ token_hash: hashToken(token), usuario_id: usuarioId, expires_at: expires.toISOString() });
  if (error) throw new Error(`No se pudo crear la sesión: ${error.code}`);
  await db.from("admin_usuarios").update({ ultimo_acceso: new Date().toISOString() }).eq("id", usuarioId);
  // Limpieza de sesiones vencidas (barata y sin cron).
  await db.from("admin_sesiones").delete().lt("expires_at", new Date().toISOString());
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await supabaseAdmin().from("admin_sesiones").delete().eq("token_hash", hashToken(token));
  jar.delete(ADMIN_COOKIE);
}

/** La persona con sesión válida y activa, o null. Una sola consulta por petición. */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = supabaseAdmin();
  const { data: s, error } = await db.from("admin_sesiones").select("usuario_id, expires_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (error || !s || new Date(s.expires_at as string).getTime() < Date.now()) return null;
  const { data: u } = await db.from("admin_usuarios").select("id, email, nombre, rol, aliado_id, user_id, activo").eq("id", s.usuario_id).maybeSingle();
  if (!u || !u.activo) return null;
  return { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, aliadoId: u.aliado_id, userId: u.user_id };
});

/**
 * Exige sesión (y, si se indica, un rol). Cada página y cada server action del panel la llaman: ocultar un
 * botón no es seguridad. Sin sesión lleva al acceso; con un rol sin permiso, al inicio del panel.
 */
export async function requireAdmin(roles?: Rol[]): Promise<AdminUser> {
  const user = await getAdmin();
  if (!user) redirect("/admin/acceso");
  if (roles && !roles.includes(user.rol)) redirect("/admin");
  return user;
}

/** Hash del token de la sesión actual (para no cerrarla junto con las demás). */
export async function currentTokenHash(): Promise<string | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** Cierra las sesiones de una persona; con `except`, conserva esa (la del navegador actual). */
export async function closeSessions(usuarioId: string, except?: string | null) {
  let q = supabaseAdmin().from("admin_sesiones").delete().eq("usuario_id", usuarioId);
  if (except) q = q.neq("token_hash", except);
  const { error } = await q;
  if (error) throw new Error(`No se pudieron cerrar las sesiones: ${error.code}`);
}
