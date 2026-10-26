import type { Metadata } from "next";
import { ACCION_LABEL, ENTIDAD_LABEL, diferencias, resumen } from "@/lib/admin/audit-format";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHead } from "../_ui/PageHead";
import { AuditLog, type Evento } from "./AuditLog";

export const metadata: Metadata = { title: "Auditoría" };

const LIMITE = 1000;
const dia = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hora = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

async function getEventos(): Promise<Evento[]> {
  const db = supabaseAdmin();
  const [rows, equipo] = await Promise.all([
    db.from("auditoria").select("id, created_at, usuario_id, usuario_email, accion, entidad, entidad_id, antes, despues").order("created_at", { ascending: false }).limit(LIMITE),
    db.from("admin_usuarios").select("id, nombre"),
  ]);
  if (rows.error) throw new Error("No se pudo leer la auditoría.");
  const nombres = new Map((equipo.data ?? []).map((u) => [u.id as string, u.nombre as string]));
  return (rows.data ?? []).map((r) => {
    const d = new Date(r.created_at);
    return {
      id: String(r.id),
      dia: dia.format(d),
      hora: hora.format(d),
      fecha: fechaCdmx(r.created_at),
      persona: (r.usuario_id && nombres.get(r.usuario_id)) || r.usuario_email || "Sistema",
      personaKey: r.usuario_id ?? r.usuario_email ?? "sistema",
      accion: ACCION_LABEL[r.accion] ?? r.accion,
      seccion: ENTIDAD_LABEL[r.entidad] ?? r.entidad,
      seccionKey: r.entidad,
      resumen: resumen(r),
      cambios: diferencias(r.antes, r.despues),
    };
  });
}

export default async function Page() {
  await requireAdmin(["admin"]);
  const eventos = await getEventos();
  return (
    <>
      <PageHead title="Auditoría" text="Quién cambió qué y cuándo, con el valor anterior y el nuevo. Solo lectura: nadie puede borrar ni editar este registro desde el panel." />
      <AuditLog eventos={eventos} limite={LIMITE} />
    </>
  );
}
