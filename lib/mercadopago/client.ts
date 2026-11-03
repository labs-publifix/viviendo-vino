import "server-only";

// Cliente mínimo de la API de Mercado Pago (Orders). El Access Token vive solo en el servidor (MP_ACCESS_TOKEN, en
// Vercel). Fuera de producción, MP_API_BASE permite apuntar a un simulador para las pruebas automáticas.

const BASE = process.env.VERCEL_ENV !== "production" && process.env.MP_API_BASE ? process.env.MP_API_BASE : "https://api.mercadopago.com";

export const mpConfigurado = () => Boolean(process.env.MP_ACCESS_TOKEN);

export type RespuestaMP<T> = { status: number; body: T | null };

export async function mp<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; idempotencia?: string }): Promise<RespuestaMP<T>> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MP_ACCESS_TOKEN.");
  const res = await fetch(BASE + path, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.idempotencia ? { "X-Idempotency-Key": init.idempotencia } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  let body: T | null = null;
  try {
    body = text ? (JSON.parse(text) as T) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}
