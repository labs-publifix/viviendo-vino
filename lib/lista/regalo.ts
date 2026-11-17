import "server-only";
import { GIFT_END_MS, LAUNCH_AT_MS, SIGNUP_CLOSE_MS } from "@/lib/launch";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calificaDescorchador, correoLista } from "./regalo-rules";

const VENTANA = { cierreRegistroMs: SIGNUP_CLOSE_MS, inicioMs: LAUNCH_AT_MS, finMs: GIFT_END_MS };

/**
 * Al pagarse un pedido: si el correo está en la lista de espera, la marca como "ya compró" (purchased_at), así ya no le
 * llegan los recordatorios del regalo. Devuelve si el pedido lleva descorchador. Los pedidos de prueba no marcan nada.
 * Nunca rompe el flujo del pago: si la base falla, solo deja rastro en el log y responde false.
 */
export async function registrarCompraLista(p: { email: string; pagadoAt: string | null; prueba: boolean }): Promise<boolean> {
  try {
    const db = supabaseAdmin();
    const email = correoLista(p.email);
    const { data } = await db.from("waitlist_signups").select("id, created_at, source, purchased_at").eq("email", email).maybeSingle();
    if (!data) return false;
    if (!p.prueba && !data.purchased_at) {
      const marcado = await db.from("waitlist_signups").update({ purchased_at: p.pagadoAt ?? new Date().toISOString() }).eq("id", data.id);
      if (marcado.error) console.error("lista: no se marcó la compra", marcado.error.code);
    }
    return calificaDescorchador({ creadoAt: data.created_at as string, origen: (data.source as string | null) ?? null }, p.pagadoAt ? Date.parse(p.pagadoAt) : null, VENTANA);
  } catch (e) {
    console.error("lista: no se revisó el descorchador", e instanceof Error ? e.message : "error");
    return false;
  }
}

/** Para el panel: de una lista de pedidos, cuáles llevan descorchador (sin marcar nada). */
export async function pedidosConDescorchador(pedidos: { id: string; email: string; pagadoAt: string | null }[]): Promise<Set<string>> {
  const conPago = pedidos.filter((p) => p.pagadoAt);
  if (conPago.length === 0) return new Set();
  const correos = [...new Set(conPago.map((p) => correoLista(p.email)))];
  const { data, error } = await supabaseAdmin().from("waitlist_signups").select("email, created_at, source").in("email", correos);
  if (error || !data) return new Set();
  const porCorreo = new Map(data.map((r) => [r.email as string, { creadoAt: r.created_at as string, origen: (r.source as string | null) ?? null }]));
  return new Set(conPago.filter((p) => calificaDescorchador(porCorreo.get(correoLista(p.email)) ?? null, Date.parse(p.pagadoAt!), VENTANA)).map((p) => p.id));
}
