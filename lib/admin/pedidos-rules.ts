// Reglas de Pedidos y Finanzas en el panel. Puras (sin Next) para usarlas igual en el servidor y en las pruebas.
// Quién puede mover un pedido y a dónde, cómo se reparte el dinero y cuánto se le debe a cada aliado.
// El servidor revisa estas reglas en cada acción; ocultar un botón nunca es la única defensa.

import { CORREO_LABEL, type TipoCorreo } from "../email/tipos.ts";
import { precioACentavos } from "./catalogo-rules.ts";
import type { Rol } from "./rules.ts";

export const ESTADOS = ["pendiente_pago", "pagado", "preparando", "enviado", "entregado", "cancelado"] as const;
export type EstadoPedido = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  pendiente_pago: "Pago pendiente",
  pagado: "Por preparar",
  preparando: "Preparando",
  enviado: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
/** Tono del punto de estado en tablas y etiquetas (los mismos de DataTable). */
export const ESTADO_TONO: Record<EstadoPedido, "aviso" | "accent" | "ok" | "muted" | ""> = {
  pendiente_pago: "muted",
  pagado: "aviso",
  preparando: "aviso",
  enviado: "accent",
  entregado: "ok",
  cancelado: "muted",
};

/** Un pedido "cuenta" como venta desde que se pagó y mientras no se cancele. */
export const esVenta = (estado: string) => estado === "pagado" || estado === "preparando" || estado === "enviado" || estado === "entregado";

export const ACCIONES = ["marcar_pagado", "preparar", "enviar", "entregar", "cancelar"] as const;
export type AccionPedido = (typeof ACCIONES)[number];

export const ACCION_LABEL: Record<AccionPedido, string> = {
  marcar_pagado: "Marcar como pagado (prueba)",
  preparar: "Empezar a preparar",
  enviar: "Marcar como enviado",
  entregar: "Marcar como entregado",
  cancelar: "Cancelar pedido",
};

const DESTINO: Record<AccionPedido, EstadoPedido> = {
  marcar_pagado: "pagado",
  preparar: "preparando",
  enviar: "enviado",
  entregar: "entregado",
  cancelar: "cancelado",
};
export const destino = (a: AccionPedido) => DESTINO[a];

/**
 * Acciones que una persona puede hacer sobre un pedido en su estado actual.
 * - El pago lo confirma Mercado Pago; a mano solo se marca pagado un pedido de prueba (y solo un admin).
 * - Preparar, enviar y entregar: admin, atención y el aliado dueño del pedido.
 * - Cancelar (implica devolver el dinero): solo un admin, y nunca después de enviado.
 */
export function accionesPara(estado: EstadoPedido, rol: Rol, prueba: boolean): AccionPedido[] {
  const out: AccionPedido[] = [];
  if (estado === "pendiente_pago" && prueba && rol === "admin") out.push("marcar_pagado");
  if (estado === "pagado") out.push("preparar");
  if (estado === "preparando") out.push("enviar");
  if (estado === "enviado") out.push("entregar");
  if (rol === "admin" && (estado === "pendiente_pago" || estado === "pagado" || estado === "preparando")) out.push("cancelar");
  return out;
}

/** ¿Esta persona puede ver (y operar) este pedido? El aliado, solo los suyos. */
export function puedeVerPedido(user: { rol: Rol; aliadoId: string | null }, pedido: { aliadoId: string }): boolean {
  if (user.rol === "aliado") return Boolean(user.aliadoId) && user.aliadoId === pedido.aliadoId;
  return user.rol === "admin" || user.rol === "atencion";
}

/** Margen de Viviendo Vino y comisión de Mercado Pago: solo admin. */
export const veMargen = (rol: Rol) => rol === "admin";
/** Lo que se le cobró al cliente: admin y atención. El aliado no ve el precio público. */
export const veTotalCobrado = (rol: Rol) => rol === "admin" || rol === "atencion";
/** Lo que le toca al aliado (sus precios acordados): admin y el aliado. */
export const veParteAliado = (rol: Rol) => rol === "admin" || rol === "aliado";
/** El aliado prepara y envía: necesita nombre, teléfono y dirección, no el correo del cliente. */
export const veCorreoCliente = (rol: Rol) => rol === "admin" || rol === "atencion";

// ---------- Dinero ----------

// Modelo broker (28 oct 2026): el aliado acuerda un precio por botella (neto, con IVA y envío incluido) y siempre
// recibe ese monto íntegro. Viviendo Vino fija el precio público; su margen es la diferencia y de ahí paga la comisión
// de Mercado Pago (también si un pedido pagado se cancela). Descuentos y promociones salen de su margen.

/** Margen mínimo de Viviendo Vino sobre el precio final si el aliado no tiene otro: 20 %. */
export const MARGEN_MINIMO_BPS = 2000;

/**
 * Tarifa de Mercado Pago para estimar su comisión antes de cobrar: % + cargo fijo por cobro, más IVA. Es una
 * estimación (revisar con la tarifa real de la cuenta); con el cobro conectado se guarda la comisión real.
 */
export const TARIFA_MP = { porcentajeBps: 349, fijoCentavos: 400, ivaBps: 1600 } as const;

/** Comisión estimada de Mercado Pago por un cobro, con IVA, redondeada al centavo. */
export function comisionMPEstimada(totalCentavos: number): number {
  if (totalCentavos <= 0) return 0;
  const base = (totalCentavos * TARIFA_MP.porcentajeBps) / 10000 + TARIFA_MP.fijoCentavos;
  return Math.round(base * (1 + TARIFA_MP.ivaBps / 10000));
}

/** Margen de una botella: pesos y % sobre el precio final. */
export function margenBotella(finalCentavos: number, acordadoCentavos: number): { centavos: number; bps: number } {
  const centavos = finalCentavos - acordadoCentavos;
  return { centavos, bps: finalCentavos > 0 ? Math.round((centavos * 10000) / finalCentavos) : 0 };
}

/** Precio final más bajo que cumple el margen mínimo, redondeado hacia arriba al peso. */
export function precioMinimo(acordadoCentavos: number, margenMinimoBps: number): number {
  const exacto = acordadoCentavos / (1 - margenMinimoBps / 10000);
  return Math.ceil(exacto / 100) * 100;
}

/** Reparto de un pedido: lo del aliado (suma de precios acordados), el margen bruto y la comisión estimada de MP. */
export function repartoBroker(lineas: { precio: number; acordado: number; cantidad: number }[]): { total: number; aliado: number; margen: number; mp: number } {
  const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const aliado = lineas.reduce((s, l) => s + l.acordado * l.cantidad, 0);
  return { total, aliado, margen: total - aliado, mp: comisionMPEstimada(total) };
}

export type VentaFin = { estado: string; total: number; margen: number; aliado: number; mp: number };
export type ResumenFinanzas = {
  ventas: number;
  vendido: number;
  /** Margen bruto de Viviendo Vino (total − lo del aliado). */
  margen: number;
  /** Comisión de Mercado Pago (estimada hasta conectar el cobro). */
  mp: number;
  /** Margen bruto − comisión de MP. */
  margenNeto: number;
  paraAliado: number;
  /** Lo del aliado en pedidos ya entregados: lo que ya se le debe. */
  ganado: number;
  /** Lo del aliado en pedidos pagados que aún no se entregan. */
  enCamino: number;
  transferido: number;
  /** Ganado − transferido. Negativo = se le adelantó dinero. */
  saldo: number;
};

export type TransferenciaFin = { monto: number };

/** Resumen de un aliado: solo cuentan las ventas (pagadas y no canceladas). */
export function resumenFinanzas(ventas: VentaFin[], transferencias: TransferenciaFin[]): ResumenFinanzas {
  const v = ventas.filter((x) => esVenta(x.estado));
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const ganado = sum(v.filter((x) => x.estado === "entregado").map((x) => x.aliado));
  const transferido = sum(transferencias.map((t) => t.monto));
  return {
    ventas: v.length,
    vendido: sum(v.map((x) => x.total)),
    margen: sum(v.map((x) => x.margen)),
    mp: sum(v.map((x) => x.mp)),
    margenNeto: sum(v.map((x) => x.margen - x.mp)),
    paraAliado: sum(v.map((x) => x.aliado)),
    ganado,
    enCamino: sum(v.filter((x) => x.estado !== "entregado").map((x) => x.aliado)),
    transferido,
    saldo: ganado - transferido,
  };
}

// ---------- Validaciones de formularios ----------

export type Resultado<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

export const PAQUETERIAS = ["Estafeta", "DHL", "FedEx", "Paquetexpress", "99 Minutos", "Otra"] as const;

/** Datos que pide cada acción: la guía al enviar y el motivo al cancelar. */
export function validarAccion(accion: AccionPedido, datos: { paqueteria?: string; guia?: string; motivo?: string }): Resultado<{ paqueteria?: string; guia?: string; motivo?: string }> {
  const errors: Record<string, string> = {};
  if (accion === "enviar") {
    const paqueteria = (datos.paqueteria ?? "").trim();
    const guia = (datos.guia ?? "").trim().toUpperCase();
    if (!PAQUETERIAS.includes(paqueteria as (typeof PAQUETERIAS)[number])) errors.paqueteria = "Elige la paquetería.";
    if (!/^[A-Z0-9-]{4,40}$/.test(guia)) errors.guia = "Escribe el número de guía (letras, números y guiones).";
    return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { paqueteria, guia } };
  }
  if (accion === "cancelar") {
    const motivo = (datos.motivo ?? "").trim();
    if (motivo.length < 5) errors.motivo = "Escribe por qué se cancela (lo verá el equipo en el historial).";
    else if (motivo.length > 300) errors.motivo = "Usa máximo 300 caracteres.";
    return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { motivo } };
  }
  return { ok: true, data: {} };
}

export function validarNota(texto: string): Resultado<string> {
  const t = texto.trim();
  if (!t) return { ok: false, errors: { nota: "Escribe la nota." } };
  if (t.length > 300) return { ok: false, errors: { nota: "Usa máximo 300 caracteres." } };
  return { ok: true, data: t };
}

export type TransferenciaInput = { monto: string; fecha: string; referencia: string; nota: string };

/** Transferencia al aliado. `hoy` en formato AAAA-MM-DD (hora de CDMX) para no aceptar fechas futuras. */
export function validarTransferencia(input: TransferenciaInput, hoy: string): Resultado<{ monto_centavos: number; fecha: string; referencia: string | null; nota: string | null }> {
  const errors: Record<string, string> = {};
  const monto = precioACentavos(input.monto);
  if (monto === null) errors.monto = "Escribe el monto en pesos, por ejemplo 4,860.50.";
  const fecha = input.fecha.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T12:00:00Z`))) errors.fecha = "Elige la fecha de la transferencia.";
  else if (fecha > hoy) errors.fecha = "La fecha no puede ser futura.";
  else if (fecha < "2026-01-01") errors.fecha = "Revisa la fecha.";
  const referencia = input.referencia.trim();
  if (referencia.length > 120) errors.referencia = "Usa máximo 120 caracteres.";
  const nota = input.nota.trim();
  if (nota.length > 300) errors.nota = "Usa máximo 300 caracteres.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { monto_centavos: monto!, fecha, referencia: referencia || null, nota: nota || null } };
}

// ---------- Correos del pedido ----------

/** Paso del pedido al que corresponde cada correo al cliente (el aviso al equipo no se reenvía). */
export const PASO_CORREO: Partial<Record<TipoCorreo, "pagado" | "enviado" | "entregado">> = {
  pedido_confirmado: "pagado",
  pedido_enviado: "enviado",
  pedido_entregado: "entregado",
};

/** Reenviar un correo al cliente: admin o atención, y solo si el pedido ya llegó a ese paso y no se canceló. */
export function puedeReenviar(tipo: TipoCorreo, estado: EstadoPedido, rol: Rol): boolean {
  if (rol !== "admin" && rol !== "atencion") return false;
  const paso = PASO_CORREO[tipo];
  if (!paso || estado === "cancelado") return false;
  const orden: EstadoPedido[] = ["pagado", "preparando", "enviado", "entregado"];
  return orden.indexOf(estado) >= orden.indexOf(paso);
}

export type EventoLinea = { id: string; at: string; tipo: string; estado: string | null; detalle: string; quien: string };
export type CorreoLinea = { id: string; at: string; tipo: TipoCorreo; para: "cliente" | "equipo"; destinatario: string; ok: boolean; reenvio: boolean };
export type LineaTiempo =
  | ({ kind: "evento" } & EventoLinea)
  | { kind: "correo"; id: string; at: string; tipo: TipoCorreo; para: "cliente" | "equipo"; titulo: string; destinatarios: string[]; enviados: number; fallidos: number; reenvio: boolean };

/**
 * Historial del pedido con sus correos, en orden. Los avisos al equipo de un mismo momento se juntan en una sola
 * línea ("enviado a 3 personas del equipo"); cada correo al cliente va en la suya.
 */
export function lineaDeTiempo(eventos: EventoLinea[], correos: CorreoLinea[]): LineaTiempo[] {
  const lineas: LineaTiempo[] = eventos.map((e) => ({ kind: "evento", ...e }));
  for (const c of [...correos].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const ultimo = lineas.findLast((l) => l.kind === "correo" && l.para === "equipo" && l.tipo === c.tipo);
    if (c.para === "equipo" && ultimo && ultimo.kind === "correo" && Math.abs(Date.parse(c.at) - Date.parse(ultimo.at)) < 5 * 60_000) {
      if (c.destinatario) ultimo.destinatarios.push(c.destinatario);
      if (c.ok) ultimo.enviados++;
      else ultimo.fallidos++;
      continue;
    }
    lineas.push({
      kind: "correo",
      id: c.id,
      at: c.at,
      tipo: c.tipo,
      para: c.para,
      titulo: CORREO_LABEL[c.tipo],
      destinatarios: c.destinatario ? [c.destinatario] : [],
      enviados: c.ok ? 1 : 0,
      fallidos: c.ok ? 0 : 1,
      reenvio: c.reenvio,
    });
  }
  return lineas.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
