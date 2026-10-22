import "server-only";
import { z } from "zod";
import { getCatalog } from "@/lib/catalog/repo";
import { KIT_SIZE, MAX_KITS, validateKit, type KitValidation, type KitWine } from "@/lib/kit/rules";

// Validación del carrito en el servidor: forma de la petición (zod), reglas del kit y precios tomados
// de la base. Lo que mande el navegador solo aporta slugs y cantidades.

export const cartSchema = z.object({
  kits: z
    .array(
      z.object({
        id: z.string().max(64).optional(),
        items: z
          .array(
            z.object({
              slug: z.string().regex(/^[a-z0-9-]{1,120}$/),
              quantity: z.number().int().min(1).max(KIT_SIZE),
            }),
          )
          .min(1)
          .max(KIT_SIZE),
      }),
    )
    .max(MAX_KITS),
});
export type CartInput = z.infer<typeof cartSchema>;

export type ValidatedKit = { id?: string; groupName?: string } & KitValidation;
export type CartValidation = { ok: boolean; kits: ValidatedKit[]; totalCents: number };

export async function validateCart(input: CartInput): Promise<CartValidation> {
  const catalog = await getCatalog();
  const wines = new Map<string, KitWine>(catalog.wines.map((w) => [w.slug, w]));
  const groupNames = new Map(catalog.groups.map((g) => [g.code as string, g.name]));

  const kits: ValidatedKit[] = input.kits.map((k) => {
    const result = validateKit(k.items, wines);
    return { id: k.id, ...result, ...(result.ok ? { groupName: groupNames.get(result.group) } : {}) };
  });
  const ok = kits.every((k) => k.ok);
  const totalCents = kits.reduce((s, k) => s + (k.ok ? k.totalCents : 0), 0);
  return { ok, kits, totalCents };
}
