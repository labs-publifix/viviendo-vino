import "server-only";
import { createHmac, randomBytes } from "node:crypto";

// Protecciones de /api/wine-scan que no son un límite para el uso normal: interruptor y tope por IP.
// La IP se convierte en un hash con sal y nunca se guarda ni se registra en claro.

export const PAUSED_MESSAGE = "Wine Scan está en pausa por un momento. Vuelve a intentarlo más tarde.";
export const TOO_MANY_MESSAGE = "Hiciste muchos escaneos seguidos. Espera un rato y vuelve a intentarlo.";

export const scanEnabled = () => process.env.WINE_SCAN_ENABLED?.trim().toLowerCase() !== "false";

// Sin sal configurada se usa una aleatoria por instancia: el tope sigue funcionando y el hash no se puede revertir.
const SALT = process.env.WINE_SCAN_IP_SALT || randomBytes(32).toString("hex");

export function hashIp(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
  return createHmac("sha256", SALT).update(ip).digest("hex").slice(0, 32);
}

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

/**
 * Tope por hora, en memoria de cada instancia: frena ráfagas, no es exacto entre instancias de Vercel
 * (para un tope global, una regla de Vercel Firewall sobre /api/wine-scan).
 */
export function overHourlyCap(key: string, now = Date.now()): boolean {
  const max = Number(process.env.WINE_SCAN_MAX_PER_HOUR) || 30;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, t] of hits) if (t.every((x) => now - x >= WINDOW_MS)) hits.delete(k);
  return recent.length > max;
}

/**
 * Punto de extensión para un control por cuenta (fase 2, solo si se detecta abuso): aquí se revisaría la
 * sesión de la persona y su cuota. Hoy permite todo.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- la firma queda lista para la fase de cuentas
export async function authorizeScan(request: Request): Promise<{ allowed: true } | { allowed: false; message: string }> {
  return { allowed: true };
}
