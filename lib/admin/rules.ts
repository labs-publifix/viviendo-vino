// Reglas puras del panel (sin imports de Next) para usarlas igual en el servidor y en las pruebas.

export const PASSWORD_MIN = 10;
export const ADMIN_COOKIE_NAME = "vv_admin";

/** Problema de la contraseña nueva, o null si sirve. */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < PASSWORD_MIN) return `Usa al menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > 72) return "Usa máximo 72 caracteres.";
  const local = email.split("@")[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local)) return "No uses tu correo dentro de la contraseña.";
  if (/^(.)\1+$/.test(password) || /^(0123456789|1234567890|contrasena|contraseña|password)/i.test(password)) return "Elige una contraseña menos predecible.";
  return null;
}

/** Destino después de iniciar sesión: solo rutas del panel. */
export function safeAdminNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.includes("\\") || value.startsWith("/admin/acceso")) return "/admin";
  return value;
}

/** Rutas del panel que se abren sin sesión (entrar y crear contraseña). */
const PUBLIC_ADMIN = ["/admin/acceso", "/admin/recuperar", "/admin/contrasena"];

/**
 * Ruta del panel que exige la cookie de sesión. El proxy redirige de inmediato si no hay cookie (chequeo
 * optimista); la validación real la hace requireAdmin en cada página y acción.
 */
export function needsAdminSession(pathname: string): boolean {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return false;
  return !PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export type Rol = "admin" | "aliado" | "atencion";

/** Secciones del menú y quién las ve (docs/ADMIN.md). */
export const SECCIONES: { href: string; label: string; roles: Rol[] }[] = [
  { href: "/admin", label: "Inicio", roles: ["admin", "aliado", "atencion"] },
  { href: "/admin/pedidos", label: "Pedidos", roles: ["admin", "aliado", "atencion"] },
  { href: "/admin/catalogo", label: "Catálogo", roles: ["admin", "aliado"] },
  { href: "/admin/finanzas", label: "Finanzas", roles: ["admin"] },
  { href: "/admin/contenido", label: "Contenido", roles: ["admin"] },
  { href: "/admin/comunidad", label: "Comunidad", roles: ["admin"] },
  { href: "/admin/funciones", label: "Quiz IA y Wine Scan", roles: ["admin"] },
  { href: "/admin/configuracion", label: "Configuración", roles: ["admin", "aliado", "atencion"] },
  { href: "/admin/auditoria", label: "Auditoría", roles: ["admin"] },
];

export const ROL_LABEL: Record<Rol, string> = { admin: "Administrador", aliado: "Aliado", atencion: "Atención" };
