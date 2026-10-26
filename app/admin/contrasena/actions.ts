"use server";

import { redirect } from "next/navigation";
import { authClient, emailHash } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { passwordProblem } from "@/lib/admin/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Crea la contraseña con el enlace del correo. El token se verifica aquí, al enviar el formulario (no al abrir
// el enlace), para que los revisores automáticos de correo no lo gasten.

// token: si el enlace ya se verificó pero la contraseña no pasó la revisión que depende del correo, se emite uno
// nuevo para que la persona corrija sin pedir otro correo.
export type PasswordState = { error?: string; field?: "password" | "confirm"; token?: string };

export async function setPassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const token = String(form.get("t") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(token)) return { error: "El enlace no es válido. Pide uno nuevo." };
  // Todo lo que no depende del correo se revisa antes de gastar el enlace.
  const early = passwordProblem(password, "");
  if (early) return { error: early, field: "password" };
  if (password !== confirm) return { error: "Las contraseñas no coinciden.", field: "confirm" };

  const sb = authClient();
  const { data, error } = await sb.auth.verifyOtp({ token_hash: token, type: "recovery" });
  if (error || !data.user?.email) return { error: "El enlace ya venció o ya se usó. Pide uno nuevo." };
  const email = data.user.email.toLowerCase();

  const problem = passwordProblem(password, email);
  if (problem) {
    const { data: link } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
    const fresh = link?.properties?.hashed_token;
    return fresh ? { error: problem, field: "password", token: fresh } : { error: "Ese enlace ya se usó. Pide uno nuevo." };
  }

  const db = supabaseAdmin();
  const { data: usuario } = await db.from("admin_usuarios").select("id, email, activo").eq("email", email).maybeSingle();
  if (!usuario || !usuario.activo) return { error: "Este correo ya no tiene acceso al panel." };

  const { error: updateError } = await sb.auth.updateUser({ password });
  if (updateError) {
    console.error("admin: no se guardó la contraseña", usuario.id, updateError.code);
    return { error: "No pudimos guardar la contraseña. Pide un enlace nuevo e intenta otra vez." };
  }
  await db.from("admin_usuarios").update({ user_id: data.user.id }).eq("id", usuario.id);
  // Cambiar la contraseña cierra las sesiones abiertas del panel.
  await db.from("admin_sesiones").delete().eq("usuario_id", usuario.id);
  // Y quita el bloqueo por intentos fallidos (el aviso de bloqueo invita a hacer justo esto).
  await db.from("admin_intentos").delete().eq("email_hash", emailHash(email));
  await audit({ id: usuario.id, email: usuario.email }, "contrasena", "admin_usuarios", usuario.id);
  redirect("/admin/acceso?aviso=contrasena");
}
