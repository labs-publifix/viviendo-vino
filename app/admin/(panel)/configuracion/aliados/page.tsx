import type { Metadata } from "next";
import { bpsATexto } from "@/lib/admin/catalogo-rules";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AliadosManager, type AliadoRow } from "./AliadosManager";

export const metadata: Metadata = { title: "Aliados · Configuración" };

async function getAliados(): Promise<AliadoRow[]> {
  const db = supabaseAdmin();
  const [aliados, conf, datos, productos, personas] = await Promise.all([
    db.from("aliados").select("id, nombre, ciudad, estado, comision_bps, activo, created_at").order("created_at"),
    db.from("configuracion_comercial").select("aliado_id, plazo_preparacion_dias, plazo_entrega_texto"),
    db.from("aliados_datos").select("aliado_id, razon_social, rfc, contacto_nombre, contacto_telefono, contacto_email, clabe, notas"),
    db.from("productos").select("aliado_id, activo"),
    db.from("admin_usuarios").select("aliado_id, activo").eq("rol", "aliado"),
  ]);
  if (aliados.error) throw new Error("No se pudieron leer los aliados.");
  const c = new Map((conf.data ?? []).map((x) => [x.aliado_id, x]));
  const d = new Map((datos.data ?? []).map((x) => [x.aliado_id, x]));
  return (aliados.data ?? []).map((a) => {
    const cc = c.get(a.id);
    const dd = d.get(a.id);
    return {
      id: a.id,
      nombre: a.nombre,
      ciudad: a.ciudad ?? "",
      estado: a.estado ?? "",
      comision: bpsATexto(a.comision_bps),
      activo: a.activo,
      vinos: (productos.data ?? []).filter((p) => p.aliado_id === a.id && p.activo).length,
      personas: (personas.data ?? []).filter((p) => p.aliado_id === a.id && p.activo).length,
      plazo_dias: cc?.plazo_preparacion_dias != null ? String(cc.plazo_preparacion_dias) : "",
      plazo_texto: cc?.plazo_entrega_texto ?? "",
      razon_social: dd?.razon_social ?? "",
      rfc: dd?.rfc ?? "",
      contacto_nombre: dd?.contacto_nombre ?? "",
      contacto_telefono: dd?.contacto_telefono ?? "",
      contacto_email: dd?.contacto_email ?? "",
      clabe: dd?.clabe ?? "",
      notas: dd?.notas ?? "",
    };
  });
}

export default async function Page() {
  await requireAdmin(["admin"]);
  return <AliadosManager aliados={await getAliados()} />;
}
