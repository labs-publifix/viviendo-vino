// Reglas de Pedidos y Finanzas en el panel. Puras (sin Next) para usarlas igual en el servidor y en las pruebas.
// Quién puede mover un pedido y a dónde, cómo se reparte el dinero y cuánto se le debe a cada aliado.
// El servidor revisa estas reglas en cada acción; ocultar un botón nunca es la única defensa.

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

/** La comisión y lo que le toca al aliado los ven admin y el aliado (opción C); atención no. */
export const veDinero = (rol: Rol) => rol === "admin" || rol === "aliado";
/** El aliado prepara y envía: necesita nombre, teléfono y dirección, no el correo del cliente. */
export const veCorreoCliente = (rol: Rol) => rol === "admin" || rol === "atencion";

// ---------- Dinero ----------

/**
 * Reparto de una venta. La comisión de Viviendo Vino se calcula sobre el total cobrado (envío incluido, que
 * hoy va dentro del precio) y se redondea al centavo; el aliado recibe el resto. Si se decide otra base
 * (por ejemplo, descontar la comisión de Mercado Pago), solo cambia esta función.
 */
export function reparto(totalCentavos: number, comisionBps: number): { comision: number; aliado: number } {
  const comision = Math.round((totalCentavos * comisionBps) / 10000);
  return { comision, aliado: totalCentavos - comision };
}

export type VentaFin = { estado: string; total: number; comision: number; aliado: number };
export type TransferenciaFin = { monto: number };
export type ResumenFinanzas = {
  ventas: number;
  vendido: number;
  comision: number;
  paraAliado: number;
  /** Lo del aliado en pedidos ya entregados: lo que ya se le debe. */
  ganado: number;
  /** Lo del aliado en pedidos pagados que aún no se entregan. */
  enCamino: number;
  transferido: number;
  /** Ganado − transferido. Negativo = se le adelantó dinero. */
  saldo: number;
};

/** Resumen de un aliado: solo cuentan las ventas (pagadas y no canceladas). */
export function resumenFinanzas(ventas: VentaFin[], transferencias: TransferenciaFin[]): ResumenFinanzas {
  const v = ventas.filter((x) => esVenta(x.estado));
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const ganado = sum(v.filter((x) => x.estado === "entregado").map((x) => x.aliado));
  const transferido = sum(transferencias.map((t) => t.monto));
  return {
    ventas: v.length,
    vendido: sum(v.map((x) => x.total)),
    comision: sum(v.map((x) => x.comision)),
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
