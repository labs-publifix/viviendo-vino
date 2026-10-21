import "server-only";

// Límite de intentos por IP, en memoria de cada instancia.
// En serverless cada instancia tiene su propio contador, así que esto solo frena ráfagas;
// el límite real va en una regla de Vercel Firewall (ver README).

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_ATTEMPTS;
}
