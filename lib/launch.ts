// Fechas de la apertura y de la ventana del regalo.
// Todo se deriva de NEXT_PUBLIC_LAUNCH_AT; no escribas fechas a mano en ningún otro lado.

export const TIME_ZONE = "America/Mexico_City";
export const GIFT_WINDOW_HOURS = 48;

const raw = process.env.NEXT_PUBLIC_LAUNCH_AT;

function parseLaunch(value: string | undefined): number {
  const ms = value ? Date.parse(value) : NaN;
  if (Number.isNaN(ms)) {
    throw new Error(
      "NEXT_PUBLIC_LAUNCH_AT falta o no es una fecha ISO válida (ej. 2026-11-19T09:00:00-06:00).",
    );
  }
  return ms;
}

export const LAUNCH_AT_MS = parseLaunch(raw);
export const GIFT_END_MS = LAUNCH_AT_MS + GIFT_WINDOW_HOURS * 3600 * 1000;

/** Días entre el cierre de la lista y la apertura (para el pase a producción y las últimas pruebas). */
const CLOSE_DAYS_BEFORE = 3;

/**
 * Cierre del registro en la lista de espera: a las 23:59 (hora centro de México) del día que cae
 * CLOSE_DAYS_BEFORE días antes de la apertura. Con la apertura del jueves 19 a las 9:00: lunes 16 a las 23:59.
 */
function closeOf(launchMs: number): number {
  const day = new Date(launchMs - CLOSE_DAYS_BEFORE * 24 * 3600 * 1000);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
  // Hora centro de México: UTC−6 todo el año (sin horario de verano desde 2022).
  return Date.parse(`${ymd}T23:59:00-06:00`);
}
export const SIGNUP_CLOSE_MS = closeOf(LAUNCH_AT_MS);

/** "registro": la lista acepta correos · "cerrada": ya no, falta la apertura · después, la ventana del regalo. */
export type Phase = "registro" | "cerrada" | "gift" | "after";

export function phaseAt(now: number): Phase {
  if (now < SIGNUP_CLOSE_MS) return "registro";
  if (now < LAUNCH_AT_MS) return "cerrada";
  if (now < GIFT_END_MS) return "gift";
  return "after";
}

/** La lista de espera acepta registros. */
export const signupOpen = (now = Date.now()) => now < SIGNUP_CLOSE_MS;

function format(ms: number, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, ...options }).format(ms);
}

/** "jueves 19 de noviembre" */
export function longDay(ms: number): string {
  const weekday = format(ms, { weekday: "long" });
  const day = format(ms, { day: "numeric", month: "long" });
  return `${weekday} ${day}`;
}

/** "19 de noviembre" */
export function shortDay(ms: number): string {
  return format(ms, { day: "numeric", month: "long" });
}

/** "9:00 am" */
export function timeOfDay(ms: number): string {
  return format(ms, { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s/g, " ")
    .replace(/a\.?\s?m\.?/i, "am")
    .replace(/p\.?\s?m\.?/i, "pm");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const launch = {
  day: longDay(LAUNCH_AT_MS),
  shortDay: shortDay(LAUNCH_AT_MS),
  time: timeOfDay(LAUNCH_AT_MS),
};

export const signupClose = {
  day: longDay(SIGNUP_CLOSE_MS),
  shortDay: shortDay(SIGNUP_CLOSE_MS),
  time: timeOfDay(SIGNUP_CLOSE_MS),
};

export const giftEnd = {
  day: longDay(GIFT_END_MS),
  time: timeOfDay(GIFT_END_MS),
};
