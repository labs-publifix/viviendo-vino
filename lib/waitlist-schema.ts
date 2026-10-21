import { z } from "zod";
import { EMAIL_ERROR } from "@/lib/messages";
import { WINE_TYPES } from "@/lib/wine-types";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.email({ error: EMAIL_ERROR }).max(254, { error: EMAIL_ERROR }));

export const signupSchema = z.object({
  email: emailSchema,
  wineTypes: z.array(z.enum(WINE_TYPES)).max(WINE_TYPES.length).default([]),
  // Un ?src= raro no debe impedir el registro: si no es válido, se guarda como null.
  source: z
    .string()
    .regex(/^[a-z0-9_-]{1,40}$/i)
    .transform((s) => s.toLowerCase())
    .nullish()
    .catch(null),
  // Anti-spam: campo trampa (debe venir vacío) y momento en que se mostró el formulario.
  website: z.string().max(200).optional(),
  startedAt: z.number().int().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
