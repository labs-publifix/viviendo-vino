// Descorchador de regalo de la lista de espera (decidido el 17 nov 2026). Lógica pura para probarla con `npm test`.
//
// Lleva descorchador un pedido cuando:
// - el correo se apuntó en la landing de la lista de espera (no por una guía del blog ni por el Quiz) antes del cierre
//   del registro (lunes 16, 11:59 pm), y
// - el pago se confirmó dentro de la ventana del regalo (jueves 19, 9:00 am, a sábado 21, 9:00 am).
// Las compras antes de la apertura oficial no llevan descorchador.

export type InscripcionLista = { creadoAt: string; origen: string | null };
export type VentanaRegalo = { cierreRegistroMs: number; inicioMs: number; finMs: number };

/** Inscripciones que no vinieron de la landing (descargar una guía, guardar el perfil del Quiz). */
const ORIGEN_SIN_REGALO = /^(guia|quiz):/;

export function calificaDescorchador(inscripcion: InscripcionLista | null, pagadoAtMs: number | null, v: VentanaRegalo): boolean {
  if (!inscripcion || pagadoAtMs === null || !Number.isFinite(pagadoAtMs)) return false;
  if (inscripcion.origen && ORIGEN_SIN_REGALO.test(inscripcion.origen)) return false;
  const creado = Date.parse(inscripcion.creadoAt);
  if (!Number.isFinite(creado) || creado >= v.cierreRegistroMs) return false;
  return pagadoAtMs >= v.inicioMs && pagadoAtMs < v.finMs;
}

/** Los correos de la lista se guardan en minúsculas y sin espacios; el del pedido se compara igual. */
export const correoLista = (correo: string) => correo.trim().toLowerCase();
