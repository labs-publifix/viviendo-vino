import "server-only";
import { z } from "zod";
import { getCatalog, getDisponibles } from "@/lib/catalog/repo";
import { KIT_SIZE, MAX_KITS, stockIssues, validateKit, type KitValidation, type KitWine, type StockIssue } from "@/lib/kit/rules";

// Validación del carrito en el servidor: forma de la petición (zod), reglas del kit, precios tomados de la base y
// existencias del momento (sin caché, sumando todos los kits). Lo que mande el navegador solo aporta slugs y cantidades.

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
export type CartValidation = { ok: boolean; kits: ValidatedKit[]; totalCents: number; stockIssues: StockIssue[] };

/**
 * `propias`: botellas que esta misma persona ya tiene apartadas (su pago en curso). Cuentan como suyas: si no,
 * su propio apartado la dejaría sin existencias al volver al carrito o al checkout.
 */
export async function validateCart(input: CartInput, propias?: ReadonlyMap<string, number>): Promise<CartValidation> {
  const [catalog, disponibles] = await Promise.all([getCatalog(), getDisponibles()]);
  // Existencias frescas: el catálogo en caché puede tener unos minutos.
  const wines = new Map<string, KitWine>(
    catalog.wines.map((w) => {
      const stock = disponibles ? (disponibles.get(w.id) ?? 0) + (propias?.get(w.slug) ?? 0) : (w.stock ?? null);
      return [w.slug, { ...w, stock, available: stock === null ? w.available : stock > 0 }];
    }),
  );
  const groupNames = new Map(catalog.groups.map((g) => [g.code as string, g.name]));

  const kits: ValidatedKit[] = input.kits.map((k) => {
    const result = validateKit(k.items, wines);
    return { id: k.id, ...result, ...(result.ok ? { groupName: groupNames.get(result.group) } : {}) };
  });
  const issues = stockIssues(input.kits.map((k) => k.items), wines);
  const ok = kits.every((k) => k.ok) && issues.length === 0;
  const totalCents = kits.reduce((s, k) => s + (k.ok ? k.totalCents : 0), 0);
  return { ok, kits, totalCents, stockIssues: issues };
}
