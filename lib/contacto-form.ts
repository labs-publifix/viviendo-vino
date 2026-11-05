import { z } from "zod";
import { EMAIL_ERROR } from "./messages.ts";

// Formulario de /contacto: motivos, validación (la misma en el navegador y en el servidor) y límites anti-spam.
// Lógica pura para probarla con `npm test`.

export const MOTIVOS = [
  { id: "pedido", texto: "Mi pedido o una compra" },
  { id: "marketing", texto: "Servicios de marketing para marcas de vino" },
  { id: "ia", texto: "Experiencias con IA para marcas y restaurantes" },
  { id: "otro", texto: "Otro" },
] as const;

export type MotivoId = (typeof MOTIVOS)[number]["id"];
const MOTIVO_IDS = MOTIVOS.map((m) => m.id) as [MotivoId, ...MotivoId[]];

export const textoMotivo = (id: MotivoId) => MOTIVOS.find((m) => m.id === id)!.texto;

/** ?motivo= de la URL → motivo preseleccionado (o vacío si no es uno válido). */
export function motivoDeUrl(valor: string | string[] | undefined): MotivoId | "" {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return MOTIVO_IDS.includes(v as MotivoId) ? (v as MotivoId) : "";
}

export const MENSAJE_MAX = 2000;
/** Menos tiempo que esto entre abrir el formulario y enviarlo = un bot. */
export const MIN_LLENADO_MS = 3000;
/** Envíos por IP. */
export const LIMITE_IP = { max: 5, windowMs: 60 * 60 * 1000 };

const sinControl = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

export const contactoSchema = z.object({
  nombre: z
    .string()
    .transform((s) => sinControl(s).replace(/\s+/g, " ").trim())
    .pipe(z.string().min(2, { error: "Escribe tu nombre." }).max(120, { error: "El nombre es demasiado largo." })),
  // Igual que el correo de la lista de espera (minúsculas, sin espacios).
  correo: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.email({ error: EMAIL_ERROR }).max(254, { error: EMAIL_ERROR })),
  telefono: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(30, { error: "Revisa el teléfono." }).regex(/^[0-9+()\s.-]*$/, { error: "Usa solo números en el teléfono." }))
    .default(""),
  motivo: z.enum(MOTIVO_IDS, { error: "Elige el motivo de tu mensaje." }),
  mensaje: z
    .string()
    .transform((s) => sinControl(s).trim())
    .pipe(z.string().min(10, { error: "Cuéntanos un poco más (al menos 10 caracteres)." }).max(MENSAJE_MAX, { error: `El mensaje admite hasta ${MENSAJE_MAX} caracteres.` })),
  privacidad: z.literal(true, { error: "Confirma que leíste el Aviso de privacidad." }),
});

export type ContactoDatos = z.infer<typeof contactoSchema>;
export type ContactoCampo = keyof ContactoDatos;
export type ContactoErrores = Partial<Record<ContactoCampo, string>>;

export function erroresContacto(error: z.ZodError): ContactoErrores {
  const out: ContactoErrores = {};
  for (const issue of error.issues) {
    const k = issue.path[0] as ContactoCampo | undefined;
    if (k && !out[k]) out[k] = k === "correo" ? EMAIL_ERROR : issue.message;
  }
  return out;
}

/** Bot: llenó el campo oculto o envió demasiado rápido. */
export function esBot(sitio: unknown, inicio: unknown, ahora = Date.now()): boolean {
  if (typeof sitio === "string" && sitio.trim() !== "") return true;
  return typeof inicio !== "number" || !Number.isFinite(inicio) || ahora - inicio < MIN_LLENADO_MS;
}
