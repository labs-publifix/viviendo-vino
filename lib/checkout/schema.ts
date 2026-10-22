import { z } from "zod";
import { MIN_AGE, ageOn, parseDate, todayInMexico } from "./age";

// Datos del checkout. El servidor valida con este mismo esquema; el navegador lo usa para avisar antes.
// Mensajes en voz de marca: qué pasó y qué hacer.

export const MX_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
  "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz",
  "Yucatán", "Zacatecas",
] as const;

const text = (label: string, max: number) =>
  z.string({ message: `Escribe ${label}.` }).trim().min(1, `Escribe ${label}.`).max(max, `Usa máximo ${max} caracteres.`);

export const checkoutSchema = z.object({
  name: text("tu nombre completo", 120).refine((v) => v.split(/\s+/).length >= 2, "Escribe nombre y apellido."),
  email: z.string({ message: "Escribe tu correo." }).trim().toLowerCase().max(254).email("Revisa tu correo: falta algo, como la @ o el dominio."),
  phone: z
    .string({ message: "Escribe 10 dígitos, sin lada internacional." })
    .transform((v) => v.replace(/[\s()-]/g, "").replace(/^\+?52/, ""))
    .pipe(z.string().regex(/^\d{10}$/, "Escribe 10 dígitos, sin lada internacional.")),
  street: text("calle y número", 160),
  neighborhood: text("la colonia", 120),
  postalCode: z.string({ message: "El código postal tiene 5 dígitos." }).trim().regex(/^\d{5}$/, "El código postal tiene 5 dígitos."),
  city: text("la ciudad o municipio", 120),
  state: z.enum(MX_STATES, { message: "Elige tu estado." }),
  references: z.string({ message: "Revisa las referencias." }).trim().max(300, "Usa máximo 300 caracteres.").optional().default(""),
  receiver: z.string({ message: "Revisa quién recibe." }).trim().max(120, "Usa máximo 120 caracteres.").optional().default(""),
  birthdate: z
    .string({ message: "Escribe tu fecha de nacimiento completa." })
    .refine((v) => parseDate(v) !== null, "Escribe tu fecha de nacimiento completa.")
    .refine((v) => {
      const age = ageOn(v, todayInMexico());
      return age !== null && age >= MIN_AGE && age <= 120;
    }, `Para comprar necesitas tener ${MIN_AGE} años cumplidos.`),
  adult: z.literal(true, { message: `Confirma que tienes ${MIN_AGE} años o más.` }),
  invoice: z.boolean().optional().default(false),
  promos: z.boolean().optional().default(false),
  terms: z.literal(true, { message: "Acepta los términos y el aviso de privacidad para continuar." }),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutField = keyof CheckoutInput;
export type FieldErrors = Partial<Record<CheckoutField, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as CheckoutField | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
