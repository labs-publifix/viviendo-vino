// Montos en centavos enteros (Fundamentos §12): nunca decimales de punto flotante.

const MXN = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** 180000 → "$1,800" */
export function formatMXN(cents: number): string {
  return `$${MXN.format(Math.round(cents / 100))}`;
}

export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * Descuento que se muestra cuando un vino tiene "precio antes" (tachado) mayor que su precio final.
 * 38000 y 30000 → 21. Devuelve null si no hay precio antes, si no es mayor o si el descuento redondeado es 0.
 * Solo es informativo: lo que se cobra siempre es el precio final (precio_centavos), recalculado en el servidor.
 */
export function discountPercent(compareCents: number | null | undefined, finalCents: number): number | null {
  if (!compareCents || !(compareCents > finalCents) || finalCents <= 0) return null;
  const pct = Math.round(((compareCents - finalCents) / compareCents) * 100);
  return pct >= 1 ? pct : null;
}
