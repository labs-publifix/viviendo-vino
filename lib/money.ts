// Montos en centavos enteros (Fundamentos §12): nunca decimales de punto flotante.

const MXN = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** 180000 → "$1,800" */
export function formatMXN(cents: number): string {
  return `$${MXN.format(Math.round(cents / 100))}`;
}

export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}
