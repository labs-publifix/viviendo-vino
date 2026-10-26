import type { Metadata } from "next";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { ROL_DESC, ROL_LABEL, initials, type Rol } from "@/lib/admin/rules";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { EquipoManager, type Miembro } from "./EquipoManager";

export const metadata: Metadata = { title: "Equipo · Configuración" };

async function getEquipo(): Promise<{ miembros: Miembro[]; aliados: { id: string; nombre: string }[] }> {
  const db = supabaseAdmin();
  const [usuarios, aliados] = await Promise.all([
    db.from("admin_usuarios").select("id, email, nombre, rol, aliado_id, user_id, activo, ultimo_acceso, created_at").order("created_at"),
    db.from("aliados").select("id, nombre").order("nombre"),
  ]);
  if (usuarios.error) throw new Error("No se pudo leer el equipo.");
  const nombreAliado = new Map((aliados.data ?? []).map((a) => [a.id as string, a.nombre as string]));
  // Código en dos pasos de cada quien (el equipo es chico: una consulta por persona con cuenta).
  const conTotp = new Set<string>();
  await Promise.all(
    (usuarios.data ?? [])
      .filter((u) => u.user_id)
      .map(async (u) => {
        const { data } = await db.auth.admin.mfa.listFactors({ userId: u.user_id as string });
        if (data?.factors?.some((f) => f.factor_type === "totp" && f.status === "verified")) conTotp.add(u.id as string);
      }),
  );
  return {
    miembros: (usuarios.data ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      iniciales: initials(u.nombre),
      rol: u.rol as Rol,
      rolLabel: ROL_LABEL[u.rol as Rol],
      aliadoId: u.aliado_id,
      aliado: u.aliado_id ? (nombreAliado.get(u.aliado_id) ?? null) : null,
      estado: !u.activo ? "sin-acceso" : u.user_id && u.ultimo_acceso ? "activo" : "pendiente",
      ultimoAcceso: u.ultimo_acceso ? fechaCdmx(u.ultimo_acceso) : null,
      totp: conTotp.has(u.id),
    })),
    aliados: (aliados.data ?? []).map((a) => ({ id: a.id, nombre: a.nombre })),
  };
}

export default async function Page() {
  const user = await requireAdmin(["admin"]);
  const { miembros, aliados } = await getEquipo();
  const roles = (["admin", "atencion", "aliado"] as Rol[]).map((r) => ({ value: r, label: ROL_LABEL[r], desc: ROL_DESC[r] }));
  return <EquipoManager miembros={miembros} aliados={aliados} roles={roles} yo={user.id} />;
}
