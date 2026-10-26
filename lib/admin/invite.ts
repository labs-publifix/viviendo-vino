import "server-only";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPasswordLink } from "./email";

// Enlace para crear (o volver a crear) la contraseña del panel. Lo usan "Olvidé mi contraseña" / "Es mi primera
// vez" y las invitaciones de Configuración → Equipo. El enlace vence en una hora y sirve una sola vez.

/** Origen del enlace: www en producción; en dev y local, el host de la petición (validado). */
export async function siteOrigin(): Promise<string> {
  if (process.env.VERCEL_ENV === "production") return SITE_URL;
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(:\d{2,5})?$/i.test(host)) return SITE_URL;
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

type Usuario = { id: string; email: string; nombre: string; user_id: string | null };

/** Crea la cuenta de acceso si hace falta y envía el correo con el enlace. Lanza error si no se pudo. */
export async function sendAccessLink(usuario: Usuario) {
  const db = supabaseAdmin();
  const primera = !usuario.user_id;
  if (primera) {
    // Cuenta de acceso sin contraseña todavía; la crea la persona con el enlace.
    const { error } = await db.auth.admin.createUser({ email: usuario.email, email_confirm: true });
    if (error && error.code !== "email_exists") throw new Error(`createUser: ${error.code}`);
  }
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email: usuario.email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.code ?? "sin token"}`);
  if (data.user?.id && data.user.id !== usuario.user_id) await db.from("admin_usuarios").update({ user_id: data.user.id }).eq("id", usuario.id);
  const url = `${await siteOrigin()}/admin/contrasena?t=${encodeURIComponent(data.properties.hashed_token)}`;
  await sendPasswordLink(usuario.email, usuario.nombre, url, primera);
}
