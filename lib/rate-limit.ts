import "server-only";

// Límite de intentos por IP, en memoria de cada instancia.
// En serverless cada instancia tiene su propio contador, así que esto solo frena ráfagas;
// el límite real va en una regla de Vercel Firewall (ver README).

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const hits = new Map<string, number[]>();
/** Al limpiar se borra solo lo que ya no cuenta para ningún límite (el más largo es de 1 hora). */
const LIMPIEZA_MS = 60 * 60 * 1000;

/** Por omisión, 8 intentos cada 10 minutos; cada formulario puede pedir otro límite (p. ej. contacto: 5 por hora). */
export function isRateLimited(key: string, now = Date.now(), limit: { max: number; windowMs: number } = { max: MAX_ATTEMPTS, windowMs: WINDOW_MS }): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < limit.windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= LIMPIEZA_MS)) hits.delete(k);
  }
  return recent.length > limit.max;
}
