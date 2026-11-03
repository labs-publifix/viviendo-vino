// Mercado Pago (API de Orders + Card Payment Brick): reglas puras para el servidor y las pruebas. Basadas en la
// documentación oficial (checkout-api-orders, nov 2026): estados de orden y transacción, reto 3-D Secure, firma de los
// webhooks (x-signature) y datos de la tarjeta que manda el Brick. Nada de aquí habla con la red.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Lo que aparece en el estado de cuenta del cliente (decidido el 3 nov 2026). */
export const DESCRIPTOR = "VIVIENDOVINO";
/** Minutos que se aseguran las botellas justo antes de cobrar y durante el reto 3-D Secure (el banco da 40). */
export const MINUTOS_COBRO = 45;
/** Horas que siguen apartadas mientras Mercado Pago revisa un pago (antifraude). */
export const HORAS_REVISION = 48;

/** 123450 centavos → "1234.50" (la API pide montos como texto con dos decimales). */
export const montoMP = (centavos: number) => (Math.round(centavos) / 100).toFixed(2);

/** Códigos de estado (config.location.state_id) que acepta Mercado Pago, por el nombre que usa el checkout. */
export const ESTADO_MX: Record<string, string> = {
  Aguascalientes: "MX-AGU",
  "Baja California": "MX-BCN",
  "Baja California Sur": "MX-BCS",
  Campeche: "MX-CAM",
  Chiapas: "MX-CHP",
  Chihuahua: "MX-CHH",
  "Ciudad de México": "MX-DIF",
  Coahuila: "MX-COA",
  Colima: "MX-COL",
  Durango: "MX-DUR",
  "Estado de México": "MX-MEX",
  Guanajuato: "MX-GUA",
  Guerrero: "MX-GRO",
  Hidalgo: "MX-HID",
  Jalisco: "MX-JAL",
  Michoacán: "MX-MIC",
  Morelos: "MX-MOR",
  Nayarit: "MX-NAY",
  "Nuevo León": "MX-NLE",
  Oaxaca: "MX-OAX",
  Puebla: "MX-PUE",
  Querétaro: "MX-QUE",
  "Quintana Roo": "MX-ROO",
  "San Luis Potosí": "MX-SLP",
  Sinaloa: "MX-SIN",
  Sonora: "MX-SON",
  Tabasco: "MX-TAB",
  Tamaulipas: "MX-TAM",
  Tlaxcala: "MX-TLA",
  Veracruz: "MX-VER",
  Yucatán: "MX-YUC",
  Zacatecas: "MX-ZAC",
};

// ---------- Datos de la tarjeta (del Brick) ----------

export type DatosTarjeta = { token: string; metodo: string; tipo: "credit_card" | "debit_card" | "prepaid_card"; identificacion: { type: string; number: string } | null };

/**
 * Lo que el navegador puede mandar del Brick: el token de la tarjeta (ya cifrada por MercadoPago.js), la marca y el
 * tipo. Siempre a un solo pago. El monto nunca viene del navegador.
 */
export function leerTarjeta(x: unknown): DatosTarjeta | null {
  if (!x || typeof x !== "object") return null;
  const d = x as Record<string, unknown>;
  const token = typeof d.token === "string" && /^[A-Za-z0-9_-]{8,256}$/.test(d.token) ? d.token : null;
  const metodo = typeof d.payment_method_id === "string" && /^[a-z0-9_]{2,40}$/.test(d.payment_method_id) ? d.payment_method_id : null;
  const tipo = d.payment_type_id === "credit_card" || d.payment_type_id === "debit_card" || d.payment_type_id === "prepaid_card" ? d.payment_type_id : null;
  if (!token || !metodo || !tipo) return null;
  if (d.installments !== undefined && Number(d.installments) !== 1) return null;
  const id = (d.payer as { identification?: { type?: unknown; number?: unknown } } | undefined)?.identification;
  const identificacion =
    id && typeof id.type === "string" && typeof id.number === "string" && /^[A-Za-z]{2,10}$/.test(id.type) && /^[A-Za-z0-9]{4,20}$/.test(id.number) ? { type: id.type, number: id.number } : null;
  return { token, metodo, tipo, identificacion };
}

// ---------- Órdenes ----------

export type OrdenMP = {
  id?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  transactions?: { payments?: { id?: string; status?: string; status_detail?: string; amount?: string; payment_method?: { transaction_security?: { url?: string } } }[] };
};

export type Resultado =
  | { tipo: "aprobado" }
  | { tipo: "reto"; url: string }
  | { tipo: "revision" }
  | { tipo: "rechazado"; detalle: string }
  | { tipo: "reembolsado" }
  | { tipo: "contracargo" };

/** "processing/in_review": lo que se guarda en pedidos.mp_estado. */
export const estadoTexto = (o: OrdenMP) => `${o.status ?? "?"}/${o.status_detail ?? "?"}`.slice(0, 80);

/** Qué significa una orden para el pedido (estados de la documentación de Orders). */
export function interpretarOrden(o: OrdenMP): Resultado {
  const pago = o.transactions?.payments?.[0];
  const detalle = pago?.status_detail || o.status_detail || "failed";
  switch (o.status) {
    case "processed":
      return pago && pago.status !== "processed" ? { tipo: "rechazado", detalle } : { tipo: "aprobado" };
    case "action_required": {
      const url = pago?.payment_method?.transaction_security?.url;
      if (detalle === "pending_challenge" && url && /^https:\/\/[^\s]+$/.test(url)) return { tipo: "reto", url };
      return { tipo: "revision" };
    }
    case "processing":
    case "in_review":
    case "created":
      return { tipo: "revision" };
    case "refunded":
      return { tipo: "reembolsado" };
    case "charged_back":
      return { tipo: "contracargo" };
    default:
      // failed, canceled (expired), o cualquier otro: no se cobró.
      return { tipo: "rechazado", detalle };
  }
}

/** Mensaje para el cliente según el motivo del rechazo. Sin culpar: qué puede hacer. */
export function textoRechazo(detalle: string): string {
  switch (detalle) {
    case "bad_filled_card_data":
    case "invalid_card_token":
      return "Revisa los datos de tu tarjeta (número, vencimiento y código de seguridad) e intenta de nuevo.";
    case "insufficient_amount":
    case "card_insufficient_amount":
      return "Tu tarjeta no tiene fondos suficientes. Intenta con otra tarjeta.";
    case "required_call_for_authorize":
      return "Tu banco necesita que autorices este pago. Llámale y vuelve a intentar, o usa otra tarjeta.";
    case "card_disabled":
      return "Tu tarjeta está desactivada. Comunícate con tu banco o usa otra tarjeta.";
    case "max_attempts_exceeded":
      return "Llegaste al límite de intentos con esta tarjeta. Usa otra tarjeta o intenta más tarde.";
    case "invalid_installments":
      return "Esta tarjeta no acepta el pago en una sola exhibición. Intenta con otra tarjeta.";
    case "3ds_challenge_expired":
    case "expired":
      return "Se acabó el tiempo para confirmar el pago con tu banco. Intenta de nuevo.";
    case "cc_rejected_3ds_challenge":
      return "Tu banco no pudo confirmar tu identidad. Intenta de nuevo o usa otra tarjeta.";
    case "processing_error":
      return "No pudimos procesar el pago. Intenta de nuevo en un momento.";
    case "high_risk":
    case "rejected_by_issuer":
    default:
      return "Tu banco rechazó el pago. Intenta con otra tarjeta.";
  }
}

// ---------- Webhooks ----------

/**
 * Firma de un aviso de Mercado Pago (header x-signature "ts=…,v1=…"). Plantilla de la documentación:
 * "id:[data.id en minúsculas];request-id:[x-request-id];ts:[ts];", HMAC-SHA256 en hexadecimal con la clave secreta.
 * `toleranciaMs`: rechaza avisos con un ts demasiado viejo (evita que se reenvíe uno capturado).
 */
export function firmaValida(p: { xSignature: string | null; xRequestId: string | null; dataId: string | null; secret: string; ahora?: number; toleranciaMs?: number }): boolean {
  if (!p.xSignature || !p.secret) return false;
  let ts: string | null = null;
  let v1: string | null = null;
  for (const parte of p.xSignature.split(",")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    const k = parte.slice(0, i).trim();
    const v = parte.slice(i + 1).trim();
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }
  if (!ts || !v1 || !/^\d{9,16}$/.test(ts) || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  if (p.toleranciaMs && p.ahora !== undefined) {
    const ms = ts.length <= 10 ? Number(ts) * 1000 : Number(ts);
    if (Math.abs(p.ahora - ms) > p.toleranciaMs) return false;
  }
  const partes: string[] = [];
  if (p.dataId) partes.push(`id:${p.dataId.toLowerCase()}`);
  if (p.xRequestId) partes.push(`request-id:${p.xRequestId}`);
  partes.push(`ts:${ts}`);
  const calculada = createHmac("sha256", p.secret).update(partes.join(";") + ";").digest("hex");
  const a = Buffer.from(calculada, "hex");
  const b = Buffer.from(v1.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
