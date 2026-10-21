export const WINE_TYPES = ["blancos", "rosado", "tintos", "prosecco", "todo"] as const;
export type WineType = (typeof WINE_TYPES)[number];

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  blancos: "Blancos",
  rosado: "Rosado",
  tintos: "Tintos",
  prosecco: "Prosecco",
  todo: "De todo un poco",
};

const WITH_ARTICLE: Record<Exclude<WineType, "todo">, string> = {
  blancos: "los blancos",
  rosado: "el rosado",
  tintos: "los tintos",
  prosecco: "el prosecco",
};

/** "Anotamos que te gustan los blancos y el rosado." · "Anotamos que te gusta de todo un poco." */
export function wineTypesNote(types: readonly WineType[]): string | null {
  if (types.length === 0) return null;
  if (types.includes("todo")) return "Anotamos que te gusta de todo un poco.";
  const items = WINE_TYPES.filter((t): t is Exclude<WineType, "todo"> => t !== "todo" && types.includes(t));
  const words = items.map((t) => WITH_ARTICLE[t]);
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} y ${words[words.length - 1]}`;
  const plural = items.length > 1 || items[0] === "blancos" || items[0] === "tintos";
  return `Anotamos que te gusta${plural ? "n" : ""} ${list}.`;
}

/** "Todo" excluye a los demás; si llega junto con otros, gana "todo". */
export function normalizeWineTypes(types: readonly WineType[]): WineType[] {
  const unique = WINE_TYPES.filter((t) => types.includes(t));
  return unique.includes("todo") ? ["todo"] : unique;
}
