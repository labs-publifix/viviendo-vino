// Formato de la auditoría (/admin/auditoria): etiquetas, resumen de cada cambio y diferencias campo por campo.
// Puro, para usarlo igual en el servidor y en las pruebas.

import { fechaCdmx } from "./comunidad-format.ts";

export const ACCION_LABEL: Record<string, string> = {
  crear: "Creó",
  editar: "Editó",
  eliminar: "Eliminó",
  encender: "Encendió",
  apagar: "Apagó",
  mover: "Cambió el orden de",
  exportar: "Exportó",
  contrasena: "Creó su contraseña",
  cambiar_contrasena: "Cambió su contraseña",
  activar_2fa: "Activó el código en dos pasos",
  desactivar_2fa: "Desactivó el código en dos pasos",
  cerrar_sesiones: "Cerró sus otras sesiones",
  invitar: "Invitó a",
  reenviar: "Reenvió el enlace a",
  quitar_acceso: "Quitó el acceso a",
  devolver_acceso: "Devolvió el acceso a",
  pausar: "Pausó a",
  reactivar: "Reactivó a",
  disponible: "Marcó como disponible",
  agotado: "Marcó como agotado",
  ocultar: "Ocultó de la tienda",
  mostrar: "Volvió a mostrar en la tienda",
  foto: "Cambió la foto de",
  entrar: "Entró al panel",
  salir: "Salió del panel",
};

export const ENTIDAD_LABEL: Record<string, string> = {
  anuncios: "Marquesina",
  comunidad: "Comunidad",
  admin_usuarios: "Equipo",
  cuenta: "Mi cuenta",
  sesion: "Acceso",
  aliados: "Aliados",
  productos: "Catálogo",
  kits_prearmados: "Kits prearmados",
};

const CAMPO_LABEL: Record<string, string> = {
  texto: "Mensaje",
  enlace: "Enlace",
  inicia_at: "Desde",
  termina_at: "Hasta",
  activo: "Activo",
  orden: "Orden",
  posicion: "Posición",
  nombre: "Nombre",
  email: "Correo",
  rol: "Rol",
  aliado_id: "Aliado",
  filas: "Filas",
  ciudad: "Ciudad",
  estado: "Estado",
  comision_bps: "Comisión",
  plazo_preparacion_dias: "Días de preparación",
  plazo_entrega_texto: "Texto de entrega",
  razon_social: "Razón social",
  rfc: "RFC",
  contacto_nombre: "Contacto",
  contacto_telefono: "Teléfono",
  contacto_email: "Correo de contacto",
  clabe: "CLABE",
  notas: "Notas",
  nombre_oficial: "Nombre",
  productor: "Productor",
  categoria_slug: "Categoría",
  grupo_id: "Grupo",
  tipo: "Tipo",
  uva: "Uva",
  region: "Región",
  denominacion: "Denominación",
  anada: "Añada",
  volumen_ml: "Volumen (ml)",
  grado_alcohol: "Alcohol (%)",
  precio_centavos: "Precio por botella",
  precio_antes_centavos: "Precio antes (tachado)",
  premio: "Premio",
  descripcion: "Descripción",
  descripcion_aliado: "Texto del aliado",
  imagen_url: "Foto",
  disponible: "Disponible",
  items: "Botellas",
};
// Campos técnicos que no aportan al leer un cambio.
const OCULTOS = new Set(["id", "updated_at", "created_at", "user_id", "iniciaAt", "terminaAt"]);
const ROLES: Record<string, string> = { admin: "Administrador", aliado: "Aliado", atencion: "Atención" };
const LISTAS: Record<string, string> = { espera: "Lista de espera", quiz: "Correos del quiz", guias: "Guías pedidas" };

export function valor(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (campo === "rol" && typeof v === "string") return ROLES[v] ?? v;
  if ((campo === "precio_centavos" || campo === "precio_antes_centavos") && typeof v === "number") return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v / 100);
  if (campo === "comision_bps" && typeof v === "number") return `${v / 100} %`;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fechaCdmx(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export type Cambio = { campo: string; antes: string; despues: string };

/** Campos que cambiaron entre antes y después (o los que se crearon / eliminaron). */
export function diferencias(antes: unknown, despues: unknown): Cambio[] {
  const a = (antes && typeof antes === "object" ? antes : {}) as Record<string, unknown>;
  const d = (despues && typeof despues === "object" ? despues : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter((k) => !OCULTOS.has(k));
  return keys
    .filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(d[k] ?? null))
    .map((k) => ({ campo: CAMPO_LABEL[k] ?? k, antes: k in a ? valor(k, a[k]) : "—", despues: k in d ? valor(k, d[k]) : "—" }));
}

/** Una línea legible de qué pasó: "Editó · Marquesina · “Arma tu kit desde $1,800”". */
export function resumen(row: { accion: string; entidad: string; entidad_id: string | null; antes: unknown; despues: unknown }): string {
  const pick = (k: string) => {
    for (const o of [row.despues, row.antes]) {
      const v = o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined;
      if (typeof v === "string" && v) return v;
    }
    return null;
  };
  if (row.entidad === "anuncios") {
    const t = pick("texto");
    return t ? `“${t}”` : "un mensaje";
  }
  if (row.entidad === "comunidad") {
    const filas = row.despues && typeof row.despues === "object" ? (row.despues as Record<string, unknown>).filas : null;
    return `${LISTAS[row.entidad_id ?? ""] ?? row.entidad_id ?? ""}${typeof filas === "number" ? ` · ${filas} filas` : ""}`;
  }
  // Acciones sobre la propia cuenta: la frase ya está completa ("cambió su contraseña").
  if (row.accion === "contrasena") return "";
  if (row.entidad === "cuenta") return row.accion === "editar" ? "sus datos" : "";
  if (row.entidad === "admin_usuarios" || row.entidad === "aliados" || row.entidad === "kits_prearmados") return pick("nombre") ?? pick("email") ?? "";
  if (row.entidad === "productos") return pick("nombre_oficial") ?? "un vino";
  return "";
}
