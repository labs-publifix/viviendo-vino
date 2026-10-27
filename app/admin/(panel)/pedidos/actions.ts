"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { audit } from "@/lib/admin/audit";
import { siteOrigin } from "@/lib/admin/invite";
import { enviarCorreosPedido, reenviarCorreoCliente } from "@/lib/admin/pedido-correos";
import { crearPedido } from "@/lib/admin/pedidos";
import { clientePrueba, kitsPrueba } from "@/lib/admin/pedidos-prueba";
import { ACCIONES, accionesPara, destino, ESTADO_LABEL, PASO_CORREO, puedeReenviar, puedeVerPedido, validarAccion, validarNota, type AccionPedido, type EstadoPedido } from "@/lib/admin/pedidos-rules";
import { CORREO_LABEL, type TipoCorreo } from "@/lib/email/tipos";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Pedidos. Cada acción vuelve a revisar en el servidor quién la pide, si el pedido es suyo y si el estado
// actual la permite (accionesPara); el cambio solo se aplica si el pedido sigue en el estado que se leyó, así
// dos personas no pueden moverlo a la vez. Todo queda en el historial del pedido y en la auditoría.

export type PedidoState = { ok?: boolean; message?: string; error?: string; errors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVE_ERROR = "No se pudo guardar. Intenta otra vez.";

/** Pedidos de prueba: solo fuera de producción y solo un admin. */
export async function crearPedidoPrueba(): Promise<PedidoState> {
  const user = await requireAdmin(["admin"]);
  if (process.env.VERCEL_ENV === "production") return { error: "Los pedidos de prueba solo existen en dev." };
  const kits = await kitsPrueba();
  if (!kits) return { error: "No hay vinos disponibles para armar un kit." };
  const r = await crearPedido({ customer: clientePrueba(), kits, estado: "pagado", prueba: true, origen: "prueba", por: user });
  if (!r.ok) return { error: r.error };
  await audit(user, "crear", "pedidos", r.id, null, { folio: r.folio, prueba: true });
  const origen = await siteOrigin();
  after(() => enviarCorreosPedido(r.id, "pagado", origen));
  redirect(`/admin/pedidos/${r.id}?aviso=creado`);
}

async function leer(id: string) {
  const { data } = await supabaseAdmin().from("pedidos").select("id, folio, estado, prueba, aliado_id, paqueteria, guia").eq("id", id).maybeSingle();
  return data;
}

export async function moverPedido(_prev: PedidoState, form: FormData): Promise<PedidoState> {
  const user = await requireAdmin(["admin", "atencion", "aliado"]);
  const id = String(form.get("id") ?? "");
  const accion = String(form.get("accion") ?? "") as AccionPedido;
  if (!UUID.test(id) || !ACCIONES.includes(accion)) return { error: SAVE_ERROR };
  const p = await leer(id);
  if (!p || !puedeVerPedido(user, { aliadoId: p.aliado_id })) return { error: "No puedes cambiar ese pedido." };
  const estado = p.estado as EstadoPedido;
  if (!accionesPara(estado, user.rol, p.prueba).includes(accion)) return { error: `El pedido ya está “${ESTADO_LABEL[estado]}”. Recarga la página.` };
  const v = validarAccion(accion, { paqueteria: String(form.get("paqueteria") ?? ""), guia: String(form.get("guia") ?? ""), motivo: String(form.get("motivo") ?? "") });
  if (!v.ok) return { errors: v.errors };

  const nuevo = destino(accion);
  const ahora = new Date().toISOString();
  const cambios: Record<string, unknown> = { estado: nuevo, updated_at: ahora };
  if (nuevo === "pagado") cambios.pagado_at = ahora;
  if (nuevo === "enviado") Object.assign(cambios, { enviado_at: ahora, paqueteria: v.data.paqueteria, guia: v.data.guia });
  if (nuevo === "entregado") cambios.entregado_at = ahora;
  if (nuevo === "cancelado") Object.assign(cambios, { cancelado_at: ahora, motivo_cancelacion: v.data.motivo });

  const db = supabaseAdmin();
  // Solo si sigue en el estado que se leyó (nadie lo movió mientras tanto).
  const { data: hecho, error } = await db.from("pedidos").update(cambios).eq("id", id).eq("estado", estado).select("id");
  if (error) return { error: SAVE_ERROR };
  if (!hecho?.length) return { error: "Alguien más acaba de cambiar este pedido. Recarga la página." };

  const detalle = nuevo === "enviado" ? `${v.data.paqueteria} · guía ${v.data.guia}` : nuevo === "cancelado" ? v.data.motivo : null;
  await db.from("pedido_eventos").insert({ pedido_id: id, tipo: "estado", estado: nuevo, detalle, usuario_id: user.id, usuario_nombre: user.nombre });
  if (nuevo === "pagado") await db.from("pagos").insert({ pedido_id: id, proveedor: "prueba", estado: "aprobado", monto_centavos: (await db.from("pedidos").select("total_centavos").eq("id", id).single()).data?.total_centavos ?? 0 });
  await audit(user, "estado", "pedidos", id, { folio: p.folio, estado }, { folio: p.folio, estado: nuevo, ...(detalle ? { detalle } : {}) });
  // Correos: pagado (cliente y equipo), en camino y entregado (cliente). Salen después de responder.
  const correo = nuevo === "pagado" || nuevo === "enviado" || nuevo === "entregado" ? nuevo : null;
  if (correo) {
    const origen = await siteOrigin();
    after(() => enviarCorreosPedido(id, correo, origen));
  }
  refresh();
  return { ok: true, message: `Listo: el pedido quedó “${ESTADO_LABEL[nuevo]}”.${correo ? " Le avisamos al cliente por correo." : ""}` };
}

export async function agregarNota(_prev: PedidoState, form: FormData): Promise<PedidoState> {
  const user = await requireAdmin(["admin", "atencion", "aliado"]);
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { error: SAVE_ERROR };
  const p = await leer(id);
  if (!p || !puedeVerPedido(user, { aliadoId: p.aliado_id })) return { error: "No puedes cambiar ese pedido." };
  const v = validarNota(String(form.get("nota") ?? ""));
  if (!v.ok) return { errors: v.errors };
  const { error } = await supabaseAdmin().from("pedido_eventos").insert({ pedido_id: id, tipo: "nota", detalle: v.data, usuario_id: user.id, usuario_nombre: user.nombre });
  if (error) return { error: SAVE_ERROR };
  await audit(user, "nota", "pedidos", id, null, { folio: p.folio });
  refresh();
  return { ok: true, message: "Nota agregada." };
}

/** Reenvía al cliente un correo de su pedido (admin o atención). Espera a Resend para decir si salió. */
export async function reenviarCorreo(id: string, tipo: TipoCorreo): Promise<PedidoState> {
  const user = await requireAdmin(["admin", "atencion"]);
  if (!UUID.test(id) || !(tipo in CORREO_LABEL)) return { error: SAVE_ERROR };
  const p = await leer(id);
  if (!p || !puedeVerPedido(user, { aliadoId: p.aliado_id })) return { error: "No puedes cambiar ese pedido." };
  const paso = PASO_CORREO[tipo];
  if (!paso || !puedeReenviar(tipo, p.estado as EstadoPedido, user.rol)) return { error: "Ese correo no se puede reenviar en el estado actual del pedido." };
  const ok = await reenviarCorreoCliente(id, paso, user.id);
  await audit(user, "reenviar_correo", "pedidos", id, null, { folio: p.folio, correo: CORREO_LABEL[tipo], enviado: ok });
  refresh();
  return ok ? { ok: true, message: `Reenviamos “${CORREO_LABEL[tipo]}” al cliente.` } : { error: "No se pudo reenviar el correo. Intenta otra vez en un momento." };
}
