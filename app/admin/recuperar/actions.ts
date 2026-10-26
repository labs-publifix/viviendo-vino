"use server";

import { z } from "zod";
import { emailHash } from "@/lib/admin/auth";
import { sendAccessLink } from "@/lib/admin/invite";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Enlace para crear o recuperar la contraseña. Solo se envía a personas dadas de alta en el panel; la respuesta
// es la misma exista o no el correo, para no revelar quién tiene acceso.

export type LinkState = { sent?: boolean; error?: string };
const MAX_PER_HOUR = 3;
const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

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

  const { data: usuario } = await db.from("admin_usuarios").select("id, email, nombre, activo, user_id").eq("email", email).maybeSingle();
  if (!usuario || !usuario.activo) return { sent: true };

  try {
    await sendAccessLink(usuario);
  } catch (err) {
    // Sin el correo en el log: solo el id interno.
    console.error("admin: no se envió el enlace de contraseña", usuario.id, err instanceof Error ? err.message : err);
    return { error: "No pudimos enviar el correo. Intenta de nuevo en un momento." };
  }
  return { sent: true };
}
