import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, decide, isPreviewHost } from "@/lib/gate";
import { ADMIN_COOKIE_NAME, needsAdminSession } from "@/lib/admin/rules";
import { PREVIEW_COOKIE, verifyPreviewCookie } from "@/lib/preview-access";

// Interruptor de apertura (STORE_OPEN) y contraseña del preview (PREVIEW_PASSWORD).
// La lógica vive en lib/gate.ts y está cubierta por tests/gate.test.ts.

const NOT_FOUND_PATH = "/__no-existe";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const env = {
    storeOpen: process.env.STORE_OPEN === "true",
    preview: process.env.NEXT_PUBLIC_PREVIEW === "true",
    vercelEnv: process.env.VERCEL_ENV,
  };
  const inPreview = env.preview || isPreviewHost(host);
  const hasPreviewAccess = inPreview && verifyPreviewCookie(request.cookies.get(PREVIEW_COOKIE)?.value, process.env.PREVIEW_PASSWORD);

  const hasAdminCookie = request.cookies.has(ADMIN_COOKIE_NAME);
  const decision = decide({ pathname, host, env, hasPreviewAccess, hasAdminCookie });
  let response: NextResponse;
  switch (decision.action) {
    case "not-found":
      // Reescribe a una ruta inexistente: la respuesta es el 404 normal del sitio, sin pistas.
      response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      break;
    case "login": {
      const url = new URL(LOGIN_PATH, request.url);
      url.searchParams.set("next", pathname + search);
      response = pathname.startsWith("/api/")
        ? NextResponse.json({ ok: false, error: "Acceso restringido" }, { status: 401 })
        : NextResponse.redirect(url, 303);
      break;
    }
    case "rewrite":
      response = NextResponse.rewrite(new URL(decision.to + search, request.url));
      break;
    case "redirect":
      response = NextResponse.redirect(new URL(decision.to, request.url), 308);
      break;
    default:
      if (needsAdminSession(pathname) && !hasAdminCookie) {
        const url = new URL("/admin/acceso", request.url);
        if (pathname !== "/admin") url.searchParams.set("next", pathname);
        response = NextResponse.redirect(url, 307);
      } else {
        response = NextResponse.next();
      }
  }

  // Todo lo servido en el preview queda fuera de buscadores.
  if (inPreview) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  // Corre en todas las rutas salvo los archivos estáticos de compilación.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
