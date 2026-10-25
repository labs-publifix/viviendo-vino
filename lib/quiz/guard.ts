import "server-only";

// Protecciones de /api/quiz: interruptor de emergencia y tope por IP. La IP se convierte en un hash con sal
// (el mismo de Wine Scan) y nunca se guarda ni se registra en claro.

export { hashIp } from "@/lib/wine-scan/guard";

export const PAUSED_MESSAGE = "El quiz está en pausa por un momento. Mientras, puedes armar tu caja en el armador.";
export const TOO_MANY_MESSAGE = "Hiciste el quiz muchas veces seguidas. Espera un rato y vuelve a intentarlo.";

export const quizEnabled = () => process.env.QUIZ_ENABLED?.trim().toLowerCase() !== "false";

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

/** Tope por hora de quizzes completados por IP (QUIZ_RATE_LIMIT_PER_HOUR, 20 por omisión). */
export const overHourlyCap = (ipHash: string, now = Date.now()) => overCap(`quiz:${ipHash}`, Number(process.env.QUIZ_RATE_LIMIT_PER_HOUR) || 20, now);
/** Eventos de la interfaz y guardados por correo: topes amplios, solo contra abuso. */
export const overEventCap = (ipHash: string, now = Date.now()) => overCap(`evento:${ipHash}`, 300, now);
export const overSaveCap = (ipHash: string, now = Date.now()) => overCap(`correo:${ipHash}`, 10, now);

/** Tope por hora en memoria de cada instancia: frena ráfagas (para un tope global, Vercel Firewall). */
function overCap(key: string, max: number, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, t] of hits) if (t.every((x) => now - x >= WINDOW_MS)) hits.delete(k);
  return recent.length > max;
}
