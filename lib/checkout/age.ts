// Mayoría de edad (Fundamentos R10). Fechas como "AAAA-MM-DD" para no depender de zonas horarias.
// Lógica pura y sin imports para usarla en el navegador, en el servidor y en las pruebas.

export const MIN_AGE = 18;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(value: string): { y: number; m: number; d: number } | null {
  const match = DATE.exec(value);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Edad cumplida en `today`. Quien nació un 29 de febrero cumple el 1 de marzo en años no bisiestos. */
export function ageOn(birth: string, today: string): number | null {
  const b = parseDate(birth);
  const t = parseDate(today);
  if (!b || !t) return null;
  let age = t.y - b.y;
  if (t.m < b.m || (t.m === b.m && t.d < b.d)) age -= 1;
  return age;
}

/** Hoy en la Ciudad de México, como "AAAA-MM-DD". */
export function todayInMexico(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(now);
}
