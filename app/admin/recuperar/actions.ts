"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { emailHash } from "@/lib/admin/auth";
import { sendPasswordLink } from "@/lib/admin/email";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Enlace para crear o recuperar la contraseña. Solo se envía a personas dadas de alta en el panel; la respuesta
// es la misma exista o no el correo, para no revelar quién tiene acceso.

export type LinkState = { sent?: boolean; error?: string };
const MAX_PER_HOUR = 3;
const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

async function origin(): Promise<string> {
  if (process.env.VERCEL_ENV === "production") return SITE_URL;
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(:\d{2,5})?$/i.test(host)) return SITE_URL;
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export async function requestLink(_prev: LinkState, form: FormData): Promise<LinkState> {
  const parsed = schema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { error: "Revisa tu correo: parece que falta algo, por ejemplo nombre@correo.com." };
  const { email } = parsed.data;
  const db = supabaseAdmin();

  // Tope por correo: reutiliza la tabla de intentos (exito = true marca un envío de enlace).
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await db.from("admin_intentos").select("id", { count: "exact", head: true }).eq("email_hash", emailHash(`enlace:${email}`)).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return { sent: true };
  await db.from("admin_intentos").insert({ email_hash: emailHash(`enlace:${email}`), exito: true });

  const { data: usuario } = await db.from("admin_usuarios").select("id, nombre, activo, user_id").eq("email", email).maybeSingle();
  if (!usuario || !usuario.activo) return { sent: true };

  try {
    const primera = !usuario.user_id;
    if (primera) {
      // Cuenta de acceso sin contraseña todavía; la crea la persona con el enlace.
      const { error } = await db.auth.admin.createUser({ email, email_confirm: true });
      if (error && error.code !== "email_exists") throw new Error(`createUser: ${error.code}`);
    }
    const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
    if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.code ?? "sin token"}`);
    if (data.user?.id && data.user.id !== usuario.user_id) await db.from("admin_usuarios").update({ user_id: data.user.id }).eq("id", usuario.id);
    const url = `${await origin()}/admin/contrasena?t=${encodeURIComponent(data.properties.hashed_token)}`;
    await sendPasswordLink(email, usuario.nombre, url, primera);
  } catch (err) {
    // Sin el correo en el log: solo el id interno.
    console.error("admin: no se envió el enlace de contraseña", usuario.id, err instanceof Error ? err.message : err);
    return { error: "No pudimos enviar el correo. Intenta de nuevo en un momento." };
  }
  return { sent: true };
}
