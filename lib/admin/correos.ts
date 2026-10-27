import "server-only";
import { CORREO_LABEL, type TipoCorreo } from "@/lib/email/tipos";
import { supabaseAdmin } from "@/lib/supabase-admin";

// /admin/correos (solo admin): los últimos correos que salieron, con su pedido o el contenido que los pidió.
// "Enviado" = Resend lo aceptó; si llegó o se abrió se sumará después con los avisos de Resend.

const MAX = 2000;

export type CorreoFila = {
  id: string;
  at: string;
  tipo: TipoCorreo;
  tipoLabel: string;
  para: "cliente" | "equipo";
  destinatario: string;
  asunto: string;
  ok: boolean;
  error: string;
  reenvio: boolean;
  pedidoId: string | null;
  folio: string;
  referencia: string;
};

export async function getCorreos(): Promise<{ filas: CorreoFila[]; faltaTabla: boolean; desde30: string }> {
  const desde30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("correos_enviados")
    .select("id, created_at, tipo, para, destinatario, asunto, estado, error, reenvio, pedido_id, referencia")
    .order("created_at", { ascending: false })
    .limit(MAX);
  if (error) {
    console.error("admin/correos: no se pudo leer el registro", error.code);
    if (error.code === "42P01") return { filas: [], faltaTabla: true, desde30 };
    throw new Error("No se pudo leer el registro de correos.");
  }
  const ids = [...new Set((data ?? []).map((c) => c.pedido_id).filter((x): x is string => Boolean(x)))];
  const folios = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: ps } = await db.from("pedidos").select("id, folio").in("id", ids.slice(i, i + 200));
    for (const p of ps ?? []) folios.set(p.id, p.folio);
  }
  return {
    faltaTabla: false,
    desde30,
    filas: (data ?? []).map((c) => ({
      id: String(c.id),
      at: c.created_at,
      tipo: c.tipo,
      tipoLabel: CORREO_LABEL[c.tipo as TipoCorreo] ?? c.tipo,
      para: c.para,
      destinatario: c.destinatario,
      asunto: c.asunto,
      ok: c.estado === "enviado",
      error: c.error ?? "",
      reenvio: c.reenvio,
      pedidoId: c.pedido_id,
      folio: c.pedido_id ? (folios.get(c.pedido_id) ?? "") : "",
      referencia: c.referencia ?? "",
    })),
  };
}
