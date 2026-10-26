import type { Metadata } from "next";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { ROL_LABEL } from "@/lib/admin/rules";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CuentaPanel } from "./CuentaPanel";

export const metadata: Metadata = { title: "Mi cuenta · Configuración" };

async function getCuenta(usuarioId: string, userId: string | null) {
  const db = supabaseAdmin();
  const [factors, sesiones] = await Promise.all([
    userId ? db.auth.admin.mfa.listFactors({ userId }) : Promise.resolve({ data: { factors: [] } }),
    db.from("admin_sesiones").select("token_hash", { count: "exact", head: true }).eq("usuario_id", usuarioId).gte("expires_at", new Date().toISOString()),
  ]);
  const totp = factors.data?.factors?.find((f) => f.factor_type === "totp" && f.status === "verified");
  return { totpDesde: totp ? fechaCdmx(totp.created_at) : null, sesiones: sesiones.count ?? 1 };
}

export default async function Page() {
  const user = await requireAdmin();
  const { totpDesde, sesiones } = await getCuenta(user.id, user.userId);
  return <CuentaPanel nombre={user.nombre} email={user.email} rol={ROL_LABEL[user.rol]} totpDesde={totpDesde} otrasSesiones={Math.max(0, sesiones - 1)} />;
}
