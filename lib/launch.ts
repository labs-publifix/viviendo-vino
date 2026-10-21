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

export type Phase = "before" | "gift" | "after";

export function phaseAt(now: number): Phase {
  if (now < LAUNCH_AT_MS) return "before";
  if (now < GIFT_END_MS) return "gift";
  return "after";
}

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

export const giftEnd = {
  day: longDay(GIFT_END_MS),
  time: timeOfDay(GIFT_END_MS),
};
