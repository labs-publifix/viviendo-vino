// Interruptor de apertura y acceso al preview. Lógica pura (sin imports de Next) para poder probarla.
//
// Producción con STORE_OPEN != "true": solo existen la lista de espera y el panel /admin (con su propio
// inicio de sesión). Todo lo que no esté en la lista blanca de abajo responde 404, así que cualquier ruta
// nueva de la tienda queda oculta por defecto.
// Preview (NEXT_PUBLIC_PREVIEW = "true" o host dev.*): todo pide contraseña salvo la pantalla de acceso.

export type GateEnv = {
  storeOpen: boolean;
  preview: boolean;
  vercelEnv: string | undefined;
};

export type GateInput = {
  pathname: string;
  host: string;
  env: GateEnv;
  /** Cookie de acceso al preview ya verificada. */
  hasPreviewAccess: boolean;
  /** Trae la cookie del panel (solo presencia; cada página del panel valida la sesión). */
  hasAdminCookie?: boolean;
};

export type GateDecision =
  | { action: "next" }
  | { action: "not-found" }
  | { action: "login" }
  | { action: "rewrite"; to: string }
  | { action: "redirect"; to: string };

/** Ruta interna de la portada de la tienda; con la tienda abierta, "/" la muestra. */
export const STORE_HOME = "/inicio";
export const LOGIN_PATH = "/acceso";
export const LOGIN_API = "/api/acceso";

// Lo que la lista de espera necesita y debe funcionar siempre.
const WAITLIST_EXACT = new Set([
  "/",
  "/baja",
  "/correos",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image.png",
  "/twitter-image.png",
]);
const WAITLIST_PREFIXES = ["/api/waitlist", "/api/cron/email-sequence", "/_next/", "/brand/", "/email/"];

// Favicons, webclips y manifest del kit de marca, en la raíz pública.
const BRAND_KIT_FILE =
  /^\/(favicon(-\d+x\d+\.png|\.svg|\.ico)|apple-touch-icon\.png|safari-pinned-tab\.svg|site\.webmanifest|browserconfig\.xml|(android-chrome|maskable-icon|mstile|icon)-\d+x\d+\.png)$/;

// Lo que se sirve sin contraseña en el preview: lo que necesita la pantalla de acceso y el logo de los
// correos (/email/), que los clientes de correo descargan sin la cookie del preview.
const LOGIN_PREFIXES = ["/_next/", "/brand/", "/email/", "/robots.txt"];

export function isWaitlistPath(pathname: string): boolean {
  return (
    WAITLIST_EXACT.has(pathname) || BRAND_KIT_FILE.test(pathname) || WAITLIST_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

// Fotos de los vinos en public/: con la tienda cerrada solo las ve quien usa el panel.
const ADMIN_ASSET_PREFIXES = ["/img/vinos/"];

/** El panel /admin: abierto en www aunque la tienda siga cerrada; cada página exige su sesión. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isPreviewHost(host: string): boolean {
  return host.toLowerCase().startsWith("dev.");
}

export function decide({ pathname, host, env, hasPreviewAccess, hasAdminCookie = false }: GateInput): GateDecision {
  const previewHost = isPreviewHost(host);

  // dev.viviendovino.com nunca sirve el despliegue de producción.
  if (previewHost && env.vercelEnv === "production") return { action: "not-found" };

  if (env.preview || previewHost) {
    if (pathname === LOGIN_PATH || pathname === LOGIN_API) return { action: "next" };
    if (!hasPreviewAccess) {
      if (BRAND_KIT_FILE.test(pathname) || LOGIN_PREFIXES.some((p) => pathname.startsWith(p))) return { action: "next" };
      return { action: "login" };
    }
  } else if (pathname === LOGIN_PATH || pathname === LOGIN_API) {
    // Fuera del preview la pantalla de acceso no existe.
    return { action: "not-found" };
  }

  if (!env.storeOpen) {
    if (isWaitlistPath(pathname) || isAdminPath(pathname)) return { action: "next" };
    if (hasAdminCookie && ADMIN_ASSET_PREFIXES.some((p) => pathname.startsWith(p))) return { action: "next" };
    return { action: "not-found" };
  }

  // Tienda abierta: la portada es la de la tienda; la ruta interna no se expone duplicada.
  if (pathname === "/") return { action: "rewrite", to: STORE_HOME };
  if (pathname === STORE_HOME) return { action: "redirect", to: "/" };
  return { action: "next" };
}

/** Destino seguro después del acceso: solo rutas internas. */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
