// Reglas del kit (Fundamentos R1–R3, C-04): exactamente 6 botellas, todas del mismo grupo, repetición
// libre. Lógica pura, sin imports de Next ni de alias, para usarla igual en el navegador (armador), en el
// servidor (validación con precios de la base) y en las pruebas (tests/kit.test.mjs).

export const KIT_SIZE = 6;
/** Tope de kits por carrito, para que una petición no pueda pedir validar cantidades absurdas. */
export const MAX_KITS = 10;

export type KitItem = { slug: string; quantity: number };

/**
 * Lo mínimo que las reglas necesitan saber de un vino. `stock`: botellas que se pueden vender hoy (existencias
 * menos apartados, con tope); null o ausente = sin límite conocido.
 */
export type KitWine = { slug: string; name: string; group: string; priceCents: number; available: boolean; stock?: number | null };

export type AddCheck =
  | { ok: true }
  | { ok: false; reason: "full" | "other-group" | "sold-out" | "unknown" }
  | { ok: false; reason: "no-stock"; left: number };

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

/** Botellas de cada vino en una lista de kits (p. ej. los demás kits del carrito). */
export function bottlesBySlug(kits: readonly (readonly KitItem[])[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const items of kits) for (const i of items) out.set(i.slug, (out.get(i.slug) ?? 0) + i.quantity);
  return out;
}

/**
 * ¿Cabe una botella más de este vino? `elsewhere`: las que ya ocupan los demás kits del carrito, para que entre
 * todos los kits no se pidan más botellas de las que hay.
 */
export function canAdd(items: readonly KitItem[], slug: string, wines: ReadonlyMap<string, KitWine>, elsewhere?: ReadonlyMap<string, number>): AddCheck {
  const wine = wines.get(slug);
  if (!wine) return { ok: false, reason: "unknown" };
  if (!wine.available) return { ok: false, reason: "sold-out" };
  const group = kitGroup(items, wines);
  if (group && group !== wine.group) return { ok: false, reason: "other-group" };
  if (bottleCount(items) >= KIT_SIZE) return { ok: false, reason: "full" };
  if (typeof wine.stock === "number" && quantityOf(items, slug) + (elsewhere?.get(slug) ?? 0) >= wine.stock) return { ok: false, reason: "no-stock", left: wine.stock };
  return { ok: true };
}

/** Agrega una botella si las reglas lo permiten; si no, devuelve el kit sin cambios. */
export function addBottle(items: readonly KitItem[], slug: string, wines: ReadonlyMap<string, KitWine>, elsewhere?: ReadonlyMap<string, number>): KitItem[] {
  if (!canAdd(items, slug, wines, elsewhere).ok) return [...items];
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

export type StockIssue = { slug: string; name: string; requested: number; left: number };

/** Vinos que el carrito pide en más botellas de las que hay (sumando todos sus kits). */
export function stockIssues(kits: readonly (readonly KitItem[])[], wines: ReadonlyMap<string, KitWine>): StockIssue[] {
  const out: StockIssue[] = [];
  for (const [slug, requested] of bottlesBySlug(kits)) {
    const w = wines.get(slug);
    if (w && typeof w.stock === "number" && requested > w.stock) out.push({ slug, name: w.name, requested, left: w.stock });
  }
  return out;
}

/** "Solo quedan 2 botellas de X" / "X se agotó". */
export function stockMessage(name: string, left: number): string {
  if (left <= 0) return `${name} se agotó.`;
  return `Solo ${left === 1 ? "queda 1 botella" : `quedan ${left} botellas`} de ${name}.`;
}

/** Combinaciones de caja completa para un grupo de solo caja (amarillo): 6 de cada uno y partes iguales. */
export function fullCaseOptions(slugs: readonly string[]): KitItem[][] {
  const options: KitItem[][] = slugs.map((slug) => [{ slug, quantity: KIT_SIZE }]);
  if (slugs.length > 1 && KIT_SIZE % slugs.length === 0) {
    options.push(slugs.map((slug) => ({ slug, quantity: KIT_SIZE / slugs.length })));
  }
  return options;
}
