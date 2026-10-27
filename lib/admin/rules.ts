// Reglas puras del panel (sin imports de Next) para usarlas igual en el servidor y en las pruebas.

export const PASSWORD_MIN = 10;
export const ADMIN_COOKIE_NAME = "vv_admin";
/** Preferencia de la barra lateral colapsada (no es sesión ni dato personal). */
export const NAV_COOKIE = "vv_admin_nav";

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

export type SeccionIcon = "home" | "orders" | "bottle" | "wallet" | "megaphone" | "layers" | "users" | "settings" | "history" | "mail";
export type Seccion = { href: string; label: string; icon: SeccionIcon; roles: Rol[] };

/** Secciones del menú, agrupadas, y quién las ve (docs/ADMIN.md). */
export const GRUPOS: { label: string; secciones: Seccion[] }[] = [
  {
    label: "Operación",
    secciones: [
      { href: "/admin", label: "Inicio", icon: "home", roles: ["admin", "aliado", "atencion"] },
      { href: "/admin/pedidos", label: "Pedidos", icon: "orders", roles: ["admin", "aliado", "atencion"] },
      { href: "/admin/catalogo", label: "Catálogo", icon: "bottle", roles: ["admin", "aliado"] },
      { href: "/admin/finanzas", label: "Finanzas", icon: "wallet", roles: ["admin", "aliado"] },
    ],
  },
  {
    label: "Sitio",
    secciones: [
      { href: "/admin/anuncios", label: "Marquesina y anuncios", icon: "megaphone", roles: ["admin"] },
      { href: "/admin/contenido", label: "Contenido", icon: "layers", roles: ["admin"] },
      { href: "/admin/comunidad", label: "Comunidad", icon: "users", roles: ["admin"] },
    ],
  },
  {
    label: "Sistema",
    secciones: [
      { href: "/admin/configuracion", label: "Configuración", icon: "settings", roles: ["admin", "aliado", "atencion"] },
      { href: "/admin/auditoria", label: "Auditoría", icon: "history", roles: ["admin"] },
      { href: "/admin/correos", label: "Correos", icon: "mail", roles: ["admin"] },
    ],
  },
];

export const SECCIONES: Seccion[] = GRUPOS.flatMap((g) => g.secciones);

/** Grupos del menú con solo las secciones que ese rol puede ver (los grupos vacíos no se muestran). */
export function menuFor(rol: Rol) {
  return GRUPOS.map((g) => ({ label: g.label, secciones: g.secciones.filter((s) => s.roles.includes(rol)) })).filter((g) => g.secciones.length > 0);
}

/** Contenido: los tres frentes que se administran ahí. */
export const CONTENIDO_TABS = [
  { href: "/admin/contenido/quiz", label: "Quiz IA" },
  { href: "/admin/contenido/wine-scan", label: "Wine Scan" },
  { href: "/admin/contenido/blog", label: "Blog y guías" },
];

/** Iniciales para el avatar del menú ("José Bermúdez" → "JB"). */
export function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export const ROL_LABEL: Record<Rol, string> = { admin: "Administrador", aliado: "Aliado", atencion: "Atención" };

export const ROL_DESC: Record<Rol, string> = {
  admin: "Ve y cambia todo el panel.",
  atencion: "Ve los pedidos (sin montos) para dar seguimiento y atender clientes.",
  aliado: "Ve sus pedidos y sus ventas, y marca sus vinos como disponibles o agotados.",
};

type Miembro = { id: string; rol: Rol; activo: boolean };

/**
 * ¿Se puede aplicar este cambio al equipo? Nadie se quita el acceso ni el rol de admin a sí mismo (desde
 * aquí), y siempre queda al menos un admin con acceso. Devuelve el problema o null.
 */
export function equipoProblema(equipo: Miembro[], yo: string, cambio: { id: string; rol?: Rol; activo?: boolean }): string | null {
  const actual = equipo.find((m) => m.id === cambio.id);
  if (!actual) return "Esa persona ya no está en el equipo. Recarga la página.";
  if (cambio.id === yo) {
    if (cambio.activo === false) return "No puedes quitarte el acceso a ti mismo. Pídeselo a otra persona administradora.";
    if (cambio.rol && cambio.rol !== actual.rol) return "No puedes cambiar tu propio rol. Pídeselo a otra persona administradora.";
  }
  const despues = equipo.map((m) => (m.id === cambio.id ? { ...m, rol: cambio.rol ?? m.rol, activo: cambio.activo ?? m.activo } : m));
  if (!despues.some((m) => m.rol === "admin" && m.activo)) return "Tiene que quedar al menos una persona administradora con acceso.";
  return null;
}
