import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AdminUser } from "./session";

// Registro de auditoría (Fundamentos P-08): quién cambió qué, cuándo, y el valor anterior y nuevo.
// Nunca guarda contraseñas ni tokens. Si falla, se registra en el log pero no frena el cambio ya hecho.

export async function audit(
  user: Pick<AdminUser, "id" | "email"> | null,
  accion: string,
  entidad: string,
  entidadId: string | null,
  antes: unknown = null,
  despues: unknown = null,
) {
  const { error } = await supabaseAdmin()
    .from("auditoria")
    .insert({ usuario_id: user?.id ?? null, usuario_email: user?.email ?? null, accion, entidad, entidad_id: entidadId, antes, despues });
  if (error) console.error("admin: no se guardó la auditoría", accion, entidad, error.code);
}
