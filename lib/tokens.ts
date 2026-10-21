import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Token de baja: "<id del registro>.<firma HMAC>". No contiene el correo.

function secret(): string {
  const value = process.env.WAITLIST_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error("WAITLIST_TOKEN_SECRET falta o es muy corto (mínimo 32 caracteres).");
  return value;
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(`unsubscribe:${id}`).digest("base64url");
}

export function unsubscribeToken(id: string): string {
  return `${id}.${sign(id)}`;
}

/** Devuelve el id del registro si la firma es válida. */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const [id, signature, extra] = token.split(".");
  if (!id || !signature || extra !== undefined) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}
