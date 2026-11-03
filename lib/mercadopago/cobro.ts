import "server-only";
import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { siteOrigin } from "@/lib/admin/invite";
import { enviarCorreosPedido } from "@/lib/admin/pedido-correos";
import { leerCambios } from "@/lib/admin/pedidos";
import type { MX_STATES } from "@/lib/checkout/schema";
import { leerApartado, type Previo } from "@/lib/inventario/apartado";
import { avisarUmbrales } from "@/lib/inventario/avisos";
import { leerFaltantes, textoFaltante } from "@/lib/inventario/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mp } from "./client";
import { DESCRIPTOR, ESTADO_MX, estadoTexto, HORAS_REVISION, interpretarOrden, MINUTOS_COBRO, montoMP, textoRechazo, type DatosTarjeta, type OrdenMP } from "./rules";

// Cobro con tarjeta (API de Orders de Mercado Pago). El monto sale del pedido en la base (con su descuento), nunca
// del navegador. Antes de cobrar se aseguran las botellas; si no alcanzan, no se cobra. El resultado de Mercado Pago
// (al cobrar, al consultar después del reto 3-D Secure o por su webhook) se aplica siempre en aplicarOrden, que es
// idempotente: el mismo aviso dos veces no cobra ni descuenta dos veces.

// Comprobación de tipos: un código para cada estado del checkout.
const _estados: Record<(typeof MX_STATES)[number], string> = ESTADO_MX;
void _estados;

export type EstadoPago =
  | { estado: "pagado"; folio: string }
  | { estado: "reto"; url: string }
  | { estado: "revision"; folio: string }
  | { estado: "rechazado"; mensaje: string }
  | { estado: "error"; mensaje: string; faltantes?: string };

const ERROR = "No pudimos procesar el pago. No se hizo ningún cargo; intenta de nuevo en un momento.";

type PedidoPago = { id: string; folio: string; estado: string; prueba: boolean; total_centavos: number; comision_mp_centavos: number | null; cliente_nombre: string; cliente_email: string; cliente_telefono: string; estado_mx: string; mp_order_id: string | null; mp_estado: string | null };
const COLS = "id, folio, estado, prueba, total_centavos, comision_mp_centavos, cliente_nombre, cliente_email, cliente_telefono, estado_mx, mp_order_id, mp_estado";

async function pedido(id: string): Promise<PedidoPago | null> {
  const { data } = await supabaseAdmin().from("pedidos").select(COLS).eq("id", id).maybeSingle();
  return (data as PedidoPago | null) ?? null;
}

async function evento(pedidoId: string, detalle: string) {
  await supabaseAdmin().from("pedido_eventos").insert({ pedido_id: pedidoId, tipo: "pago", detalle: detalle.slice(0, 300) });
}

const enRevision = (mpEstado: string | null) => !!mpEstado && /^(processing|in_review|created|action_required)\//.test(mpEstado);

/** Cobra un apartado con la tarjeta del Brick. */
export async function cobrar(previo: Previo, tarjeta: DatosTarjeta): Promise<EstadoPago> {
  const a = await leerApartado(previo);
  if (!a) return { estado: "error", mensaje: "No encontramos tu pedido. Vuelve a intentarlo desde el carrito." };
  if (a.estado === "pagado") return { estado: "pagado", folio: a.folio };
  if (a.estado !== "pendiente_pago") return { estado: "error", mensaje: "Este pedido ya no se puede pagar. Vuelve a intentarlo desde el carrito." };
  const p = await pedido(a.id);
  if (!p) return { estado: "error", mensaje: ERROR };
  // Un intento anterior que sigue en curso (reto o revisión) no se cobra otra vez: se consulta.
  if (p.mp_order_id && enRevision(p.mp_estado)) return consultarPedido(p.id);

  const db = supabaseAdmin();
  const { error: ae } = await db.rpc("asegurar_apartado", { p_pedido: p.id, p_minutos: MINUTOS_COBRO });
  if (ae?.message === "sin_existencias") {
    return { estado: "error", mensaje: `Ya no hay suficientes botellas: ${leerFaltantes(ae.details).map(textoFaltante).join(" ")} No se hizo ningún cargo.` };
  }
  if (ae) return { estado: "error", mensaje: ae.message === "estado_invalido" ? "Este pedido ya no se puede pagar." : ERROR };

  const [nombre, ...apellidos] = p.cliente_nombre.replace(/\(prueba\)/i, "").trim().split(/\s+/);
  const monto = montoMP(p.total_centavos);
  const r = await mp<OrdenMP & { errors?: unknown }>("/v1/orders", {
    method: "POST",
    idempotencia: randomUUID(),
    body: {
      type: "online",
      processing_mode: "automatic",
      total_amount: monto,
      external_reference: p.id,
      description: `Viviendo Vino · pedido ${p.folio}`,
      payer: {
        email: p.cliente_email,
        first_name: nombre,
        ...(apellidos.length ? { last_name: apellidos.join(" ") } : {}),
        ...(tarjeta.identificacion ? { identification: tarjeta.identificacion } : {}),
        phone: { area_code: p.cliente_telefono.slice(0, 2), number: p.cliente_telefono.slice(2) },
      },
      config: {
        ...(ESTADO_MX[p.estado_mx] ? { location: { state_id: ESTADO_MX[p.estado_mx] } } : {}),
        // 3-D Secure cuando el riesgo lo pide (recomendado por Mercado Pago); el contracargo lo absorbe la red.
        online: { transaction_security: { validation: "on_fraud_risk", liability_shift: "required" } },
      },
      transactions: {
        payments: [{ amount: monto, payment_method: { id: tarjeta.metodo, type: tarjeta.tipo, token: tarjeta.token, installments: 1, statement_descriptor: DESCRIPTOR } }],
      },
    },
  }).catch((e: unknown) => {
    console.error("mercadopago: no respondió al crear la orden", e instanceof Error ? e.name : "error");
    return null;
  });
  if (!r) return { estado: "error", mensaje: ERROR };
  const orden = r.body;
  if (!orden?.id) {
    // 4xx sin orden: datos inválidos o credenciales. No se cobró nada.
    console.error("mercadopago: no se creó la orden", r.status);
    return { estado: "error", mensaje: r.status === 400 ? "Revisa los datos de tu tarjeta e intenta de nuevo." : ERROR };
  }
  return aplicarOrden(p.id, orden, "cobro");
}

/** Consulta la orden del último intento y la aplica (después del reto 3-D Secure o mientras está en revisión). */
export async function consultarPedido(pedidoId: string): Promise<EstadoPago> {
  const p = await pedido(pedidoId);
  if (!p) return { estado: "error", mensaje: ERROR };
  if (p.estado === "pagado" || p.estado === "preparando" || p.estado === "enviado" || p.estado === "entregado") return { estado: "pagado", folio: p.folio };
  if (!p.mp_order_id) return { estado: "rechazado", mensaje: "Todavía no hay un pago para este pedido." };
  const r = await mp<OrdenMP>(`/v1/orders/${encodeURIComponent(p.mp_order_id)}`, { method: "GET" }).catch(() => null);
  if (!r?.body?.id) return { estado: "revision", folio: p.folio };
  return aplicarOrden(p.id, r.body, "consulta");
}

export async function consultarApartado(previo: Previo): Promise<EstadoPago> {
  const a = await leerApartado(previo);
  if (!a) return { estado: "error", mensaje: "No encontramos tu pedido." };
  return consultarPedido(a.id);
}

/**
 * Aplica el estado de una orden de Mercado Pago a su pedido. Lo usan el cobro, la consulta y el webhook.
 * - Aprobada: descuenta las botellas y pasa a "Por preparar" (confirmar_pago); correos al cliente y al equipo.
 *   Si el pedido ya no podía pagarse (se canceló o venció mientras el banco decidía), se reembolsa sola.
 * - Reto 3-D Secure: las botellas siguen aseguradas mientras el cliente confirma con su banco.
 * - En revisión: siguen apartadas hasta 48 h.
 * - Rechazada: si estaba en revisión, se liberan las botellas y se le avisa al cliente.
 */
export async function aplicarOrden(pedidoId: string, orden: OrdenMP, origen: "cobro" | "consulta" | "webhook"): Promise<EstadoPago> {
  const db = supabaseAdmin();
  const p = await pedido(pedidoId);
  if (!p) return { estado: "error", mensaje: ERROR };
  const antes = p.mp_estado;
  const estado = estadoTexto(orden);
  const r = interpretarOrden(orden);
  const nuevoIntento = p.mp_order_id !== orden.id;
  // Una orden vieja (otro intento) no pisa la del intento vigente, salvo que sea la que se aprobó.
  if (!nuevoIntento || origen === "cobro" || r.tipo === "aprobado") {
    await db.from("pedidos").update({ mp_order_id: orden.id, mp_estado: estado, mp_actualizado_at: new Date().toISOString() }).eq("id", p.id);
  }
  if (antes !== estado || nuevoIntento) await evento(p.id, `Mercado Pago: ${descripcion(r)} (${estado})`);

  if (r.tipo === "aprobado") {
    if (p.estado !== "pendiente_pago") {
      if (["pagado", "preparando", "enviado", "entregado"].includes(p.estado)) return { estado: "pagado", folio: p.folio };
      // Cancelado o vencido mientras el banco decidía: no hay pedido que surtir, se devuelve el dinero.
      await reembolsarOrden(p.id, orden.id!, p.total_centavos, "El pago se aprobó después de que el pedido se canceló o venció");
      return { estado: "error", mensaje: "Tu pago se aprobó cuando el pedido ya había vencido, así que lo reembolsamos completo. Vuelve a intentarlo desde el carrito." };
    }
    const { data, error } = await db.rpc("confirmar_pago", {
      p_pedido: p.id,
      p_pago: { proveedor: "mercadopago", referencia: orden.id, prueba: false, comision_centavos: p.comision_mp_centavos },
      p_evento: { detalle: "Pago aprobado por Mercado Pago" },
    });
    if (error?.message === "estado_invalido") return { estado: "pagado", folio: p.folio };
    if (error) {
      // Cobrado pero sin botellas (no debería pasar: se aseguraron antes de cobrar). Se reembolsa completo.
      console.error("mercadopago: pago aprobado que no se pudo confirmar", error.message);
      await reembolsarOrden(p.id, orden.id!, p.total_centavos, "El pago se aprobó pero ya no había botellas");
      return { estado: "error", mensaje: "Tu pago se aprobó pero las botellas se acabaron en ese momento, así que lo reembolsamos completo. Disculpa la molestia." };
    }
    revalidateTag("catalogo", "max");
    const sitio = await siteOrigin().catch(() => "");
    const cambios = leerCambios(data);
    after(async () => {
      await enviarCorreosPedido(p.id, "pagado", sitio);
      await avisarUmbrales(cambios, sitio);
    });
    return { estado: "pagado", folio: p.folio };
  }

  if (r.tipo === "reto") {
    if (p.estado === "pendiente_pago") await db.rpc("asegurar_apartado", { p_pedido: p.id, p_minutos: MINUTOS_COBRO });
    return { estado: "reto", url: r.url };
  }
  if (r.tipo === "revision") {
    if (p.estado === "pendiente_pago") await db.rpc("asegurar_apartado", { p_pedido: p.id, p_minutos: HORAS_REVISION * 60 });
    return { estado: "revision", folio: p.folio };
  }
  if (r.tipo === "rechazado") {
    // Un pago que estaba en revisión y no se aprobó: se liberan las botellas y se le avisa al cliente.
    if (p.estado === "pendiente_pago" && origen !== "cobro" && enRevision(antes)) {
      await db.from("pedidos").update({ reserva_expira_at: new Date().toISOString() }).eq("id", p.id).eq("estado", "pendiente_pago");
      revalidateTag("catalogo", "max");
      const sitio = await siteOrigin().catch(() => "");
      after(() => enviarCorreosPedido(p.id, "rechazado", sitio));
    }
    return { estado: "rechazado", mensaje: textoRechazo(r.detalle) };
  }
  // Reembolso o contracargo hechos desde Mercado Pago: quedan en el historial.
  return { estado: "rechazado", mensaje: "Este pago fue reembolsado." };
}

function descripcion(r: ReturnType<typeof interpretarOrden>) {
  switch (r.tipo) {
    case "aprobado":
      return "pago aprobado";
    case "reto":
      return "el banco pidió confirmar el pago (3-D Secure)";
    case "revision":
      return "pago en revisión";
    case "rechazado":
      return "pago no aprobado";
    case "reembolsado":
      return "pago reembolsado";
    default:
      return "contracargo del cliente";
  }
}

/** Reembolso completo de una orden de Mercado Pago. true si Mercado Pago lo aceptó. */
export async function reembolsarOrden(pedidoId: string, orderId: string, montoCentavos: number, motivo: string): Promise<boolean> {
  const r = await mp<{ id?: string; status?: string; transactions?: { refunds?: { id?: string }[] } }>(`/v1/orders/${encodeURIComponent(orderId)}/refund`, {
    method: "POST",
    idempotencia: `reembolso-${pedidoId}`,
  }).catch(() => null);
  const ok = !!r && r.status >= 200 && r.status < 300;
  const db = supabaseAdmin();
  if (ok) {
    await db.from("pagos").insert({ pedido_id: pedidoId, proveedor: "mercadopago", referencia: (r!.body?.transactions?.refunds?.[0]?.id ?? orderId).slice(0, 120), estado: "reembolsado", monto_centavos: montoCentavos });
    await db.from("pedidos").update({ mp_estado: "refunded/refunded", mp_actualizado_at: new Date().toISOString() }).eq("id", pedidoId);
  } else {
    console.error("mercadopago: no se pudo reembolsar", r?.status ?? "sin respuesta");
  }
  await evento(pedidoId, ok ? `Reembolso completo en Mercado Pago: ${motivo}` : `No se pudo reembolsar en Mercado Pago (${motivo}). Revisa el pago en Mercado Pago.`);
  return ok;
}

/** Orden de Mercado Pago aprobada de un pedido (para reembolsar al cancelar). null si se pagó de otra forma. */
export async function ordenAprobada(pedidoId: string): Promise<{ orderId: string; monto: number } | null> {
  const { data } = await supabaseAdmin().from("pagos").select("referencia, monto_centavos, estado, proveedor").eq("pedido_id", pedidoId).eq("proveedor", "mercadopago");
  const aprobado = (data ?? []).find((x) => x.estado === "aprobado" && x.referencia);
  if (!aprobado || (data ?? []).some((x) => x.estado === "reembolsado")) return null;
  return { orderId: aprobado.referencia as string, monto: Number(aprobado.monto_centavos) };
}
