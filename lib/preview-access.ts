import { createHmac, timingSafeEqual } from "node:crypto";

// Cookie de acceso al preview: "<vence en ms>.<firma>". La firma usa PREVIEW_PASSWORD como llave,
// así que cambiar la contraseña invalida todas las sesiones abiertas.

export const PREVIEW_COOKIE = "vv_preview";
export const PREVIEW_MAX_AGE_S = 7 * 24 * 3600;

function sign(expires: string, password: string): string {
  return createHmac("sha256", password).update(`preview:${expires}`).digest("base64url");
}

export function createPreviewCookieValue(password: string, now = Date.now()): string {
  const expires = String(now + PREVIEW_MAX_AGE_S * 1000);
  return `${expires}.${sign(expires, password)}`;
}

export function verifyPreviewCookie(value: string | undefined, password: string | undefined, now = Date.now()): boolean {
  if (!value || !password) return false;
  const [expires, signature, extra] = value.split(".");
  if (!expires || !signature || extra !== undefined || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < now) return false;
  const expected = Buffer.from(sign(expires, password));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function passwordMatches(given: string, password: string | undefined): boolean {
  if (!password) return false;
  // Comparamos resúmenes para no filtrar la longitud.
  const a = createHmac("sha256", "vv").update(given).digest();
  const b = createHmac("sha256", "vv").update(password).digest();
  return timingSafeEqual(a, b);
}
