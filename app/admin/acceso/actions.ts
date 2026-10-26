"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { LOCKED_MESSAGE, authClient, isLocked, recordAttempt } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { safeAdminNext } from "@/lib/admin/rules";
import { startSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Inicio de sesión del panel: correo y contraseña (Supabase Auth) y, si la persona lo activó, el código de su
// app de autenticación. El mensaje de error es el mismo para correo inexistente y contraseña incorrecta.

export type LoginState = { error?: string; step?: "codigo" };

const WRONG = "El correo o la contraseña no coinciden.";
const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  codigo: z.string().trim().regex(/^\d{6}$/).optional().or(z.literal("").transform(() => undefined)),
  next: z.string().max(300).optional(),
});

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    codigo: form.get("codigo") ?? undefined,
    next: form.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "codigo" ? "El código tiene 6 dígitos." : WRONG };
  const { email, password, codigo, next } = parsed.data;

  if (await isLocked(email)) return { error: LOCKED_MESSAGE };

  const sb = authClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    await recordAttempt(email, false);
    return { error: WRONG };
  }

  const db = supabaseAdmin();
  const { data: usuario } = await db.from("admin_usuarios").select("id, activo, user_id").eq("email", email).maybeSingle();
  if (!usuario || !usuario.activo || (usuario.user_id && usuario.user_id !== data.user.id)) {
    await recordAttempt(email, false);
    return { error: WRONG };
  }

  // Código en dos pasos, si la persona lo activó.
  const { data: factors } = await sb.auth.mfa.listFactors();
  const totp = factors?.totp?.find((f) => f.status === "verified");
  if (totp) {
    if (!codigo) return { step: "codigo" };
    const { error: mfaError } = await sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code: codigo });
    if (mfaError) {
      await recordAttempt(email, false);
      return { step: "codigo", error: "El código no es correcto o ya venció. Escribe el que aparece ahora en tu app." };
    }
  }

  await recordAttempt(email, true);
  if (!usuario.user_id) await db.from("admin_usuarios").update({ user_id: data.user.id }).eq("id", usuario.id);
  await startSession(usuario.id);
  await audit({ id: usuario.id, email }, "entrar", "sesion", usuario.id);
  redirect(safeAdminNext(next));
}
