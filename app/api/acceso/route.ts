import { safeNext } from "@/lib/gate";
import { PREVIEW_COOKIE, PREVIEW_MAX_AGE_S, createPreviewCookieValue, passwordMatches } from "@/lib/preview-access";
import { isRateLimited } from "@/lib/rate-limit";

// Acceso al preview privado. Solo existe en el preview (proxy.ts responde 404 en producción).
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const next = safeNext(form?.get("next") as string | null);
  const back = (error: string) => {
    const url = new URL("/acceso", request.url);
    url.searchParams.set("error", error);
    if (next !== "/") url.searchParams.set("next", next);
    return Response.redirect(url, 303);
  };

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`acceso:${ip}`)) return back("intentos");

  const password = process.env.PREVIEW_PASSWORD;
  const given = String(form?.get("password") ?? "");
  if (!password || !passwordMatches(given, password)) return back("clave");

  const headers = new Headers({ Location: new URL(next, request.url).toString() });
  headers.append(
    "Set-Cookie",
    `${PREVIEW_COOKIE}=${createPreviewCookieValue(password)}; Path=/; Max-Age=${PREVIEW_MAX_AGE_S}; HttpOnly; Secure; SameSite=Lax`,
  );
  return new Response(null, { status: 303, headers });
}
