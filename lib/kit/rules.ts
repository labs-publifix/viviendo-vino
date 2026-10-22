// Reglas del kit (Fundamentos R1–R3, C-04): exactamente 6 botellas, todas del mismo grupo, repetición
// libre. Lógica pura, sin imports de Next ni de alias, para usarla igual en el navegador (armador), en el
// servidor (validación con precios de la base) y en las pruebas (tests/kit.test.mjs).

export const KIT_SIZE = 6;
/** Tope de kits por carrito, para que una petición no pueda pedir validar cantidades absurdas. */
export const MAX_KITS = 10;

export type KitItem = { slug: string; quantity: number };

/** Lo mínimo que las reglas necesitan saber de un vino. */
export type KitWine = { slug: string; name: string; group: string; priceCents: number; available: boolean };

export type AddCheck =
  | { ok: true }
  | { ok: false; reason: "full" | "other-group" | "sold-out" | "unknown" };

export function bottleCount(items: readonly KitItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function quantityOf(items: readonly KitItem[], slug: string): number {
  return items.find((i) => i.slug === slug)?.quantity ?? 0;
}

/** El grupo lo fija la primera botella; un kit vacío no tiene grupo. */
export function kitGroup(items: readonly KitItem[], wines: ReadonlyMap<string, KitWine>): string | null {
  for (const i of items) {
    const w = wines.get(i.slug);
    if (w && i.quantity > 0) return w.group;
  }
  return null;
}

export function canAdd(items: readonly KitItem[], slug: string, wines: ReadonlyMap<string, KitWine>): AddCheck {
  const wine = wines.get(slug);
  if (!wine) return { ok: false, reason: "unknown" };
  if (!wine.available) return { ok: false, reason: "sold-out" };
  const group = kitGroup(items, wines);
  if (group && group !== wine.group) return { ok: false, reason: "other-group" };
  if (bottleCount(items) >= KIT_SIZE) return { ok: false, reason: "full" };
  return { ok: true };
}

/** Agrega una botella si las reglas lo permiten; si no, devuelve el kit sin cambios. */
export function addBottle(items: readonly KitItem[], slug: string, wines: ReadonlyMap<string, KitWine>): KitItem[] {
  if (!canAdd(items, slug, wines).ok) return [...items];
  return quantityOf(items, slug) > 0
    ? items.map((i) => (i.slug === slug ? { ...i, quantity: i.quantity + 1 } : i))
    : [...items, { slug, quantity: 1 }];
}

export function removeBottle(items: readonly KitItem[], slug: string): KitItem[] {
  return items
    .map((i) => (i.slug === slug ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0);
}

export function kitTotalCents(items: readonly KitItem[], wines: ReadonlyMap<string, KitWine>): number {
  return items.reduce((sum, i) => sum + i.quantity * (wines.get(i.slug)?.priceCents ?? 0), 0);
}

export type KitLine = { slug: string; name: string; quantity: number; priceCents: number; subtotalCents: number };

export type KitValidation =
  | { ok: true; group: string; lines: KitLine[]; totalCents: number }
  | { ok: false; error: KitError; message: string };

export type KitError = "empty" | "invalid-quantity" | "unknown-wine" | "sold-out" | "mixed-groups" | "wrong-size";

const fail = (error: KitError, message: string): KitValidation => ({ ok: false, error, message });

/**
 * Valida un kit completo contra el catálogo. Los precios salen de `wines` (la base), nunca de lo que
 * mande el navegador. Junta renglones repetidos del mismo vino antes de contar.
 */
export function validateKit(items: readonly KitItem[], wines: ReadonlyMap<string, KitWine>): KitValidation {
  if (items.length === 0) return fail("empty", "El kit está vacío.");

  const merged = new Map<string, number>();
  for (const i of items) {
    if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > KIT_SIZE) {
      return fail("invalid-quantity", "Una de las cantidades no es válida.");
    }
    merged.set(i.slug, (merged.get(i.slug) ?? 0) + i.quantity);
  }

  const lines: KitLine[] = [];
  const groups = new Set<string>();
  for (const [slug, quantity] of merged) {
    const wine = wines.get(slug);
    if (!wine) return fail("unknown-wine", "Uno de los vinos ya no está en el catálogo.");
    if (!wine.available) return fail("sold-out", `${wine.name} está agotado por ahora. Cámbialo por otro de su grupo.`);
    groups.add(wine.group);
    lines.push({ slug, name: wine.name, quantity, priceCents: wine.priceCents, subtotalCents: quantity * wine.priceCents });
  }

  if (groups.size > 1) return fail("mixed-groups", "Un kit solo lleva vinos del mismo grupo.");
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  if (count !== KIT_SIZE) {
    const missing = KIT_SIZE - count;
    return fail(
      "wrong-size",
      missing > 0
        ? `Al kit le ${missing === 1 ? "falta 1 botella" : `faltan ${missing} botellas`}.`
        : `El kit lleva ${KIT_SIZE} botellas; tiene ${count}.`,
    );
  }

  return { ok: true, group: [...groups][0], lines, totalCents: lines.reduce((s, l) => s + l.subtotalCents, 0) };
}

/** Combinaciones de caja completa para un grupo de solo caja (amarillo): 6 de cada uno y partes iguales. */
export function fullCaseOptions(slugs: readonly string[]): KitItem[][] {
  const options: KitItem[][] = slugs.map((slug) => [{ slug, quantity: KIT_SIZE }]);
  if (slugs.length > 1 && KIT_SIZE % slugs.length === 0) {
    options.push(slugs.map((slug) => ({ slug, quantity: KIT_SIZE / slugs.length })));
  }
  return options;
}
