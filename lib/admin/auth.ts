import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Credenciales del panel con Supabase Auth (correo y contraseña, código en dos pasos opcional). El cliente es
// por petición y sin persistencia: la sesión de Supabase vive solo mientras corre la acción en el servidor.

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export const emailHash = (email: string) => createHash("sha256").update(`vv-admin:${email.trim().toLowerCase()}`).digest("hex");

/** ¿Este correo acumula demasiados intentos fallidos recientes? */
export async function isLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCK_MINUTES * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin()
    .from("admin_intentos")
    .select("id", { count: "exact", head: true })
    .eq("email_hash", emailHash(email))
    .eq("exito", false)
    .gte("created_at", since);
  if (error) {
    // Sin poder contar intentos no se deja pasar: mejor un "intenta más tarde" que abrir la puerta a fuerza bruta.
    console.error("admin: no se pudo revisar el bloqueo", error.code);
    return true;
  }
  return (count ?? 0) >= MAX_FAILS;
}

export async function recordAttempt(email: string, exito: boolean) {
  const db = supabaseAdmin();
  await db.from("admin_intentos").insert({ email_hash: emailHash(email), exito });
  // Un acceso correcto limpia los fallos de ese correo.
  if (exito) await db.from("admin_intentos").delete().eq("email_hash", emailHash(email)).eq("exito", false);
}

export const LOCKED_MESSAGE = `Demasiados intentos. Espera ${LOCK_MINUTES} minutos o crea una contraseña nueva desde "Olvidé mi contraseña".`;
