// Tipos del catálogo. La fuente de verdad es Supabase (lib/catalog/repo.ts).

export const BOTTLE_GROUPS = ["azul", "rojo", "verde", "amarillo"] as const;
export type BottleGroup = (typeof BOTTLE_GROUPS)[number];

export const CATEGORIES = ["blancos-rosado", "tintos", "espumosos"] as const;
export type Category = (typeof CATEGORIES)[number];

export type WineType = "blanco" | "rosado" | "tinto" | "espumoso";

export type Wine = {
  id: string;
  slug: string;
  /** Nombre oficial del Excel del aliado: "Chardonnay Vento IGT 2024". */
  name: string;
  producer: string;
  category: Category;
  group: BottleGroup;
  type: WineType;
  grape: string | null;
  region: string | null;
  appellation: string | null;
  vintage: number | null;
  volumeMl: number;
  priceCents: number;
  award: string | null;
  /** Descripción en voz de marca (la del aliado se guarda aparte y no se publica). */
  description: string;
  imageUrl: string | null;
  available: boolean;
};

export const GROUP_LABELS: Record<BottleGroup, string> = {
  azul: "Grupo azul",
  rojo: "Grupo rojo",
  verde: "Grupo verde",
  amarillo: "Grupo amarillo",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  "blancos-rosado": "Blancos y rosado",
  tintos: "Tintos",
  espumosos: "Espumosos",
};

export const TYPE_LABELS: Record<WineType, string> = {
  blanco: "Blanco",
  rosado: "Rosado",
  tinto: "Tinto",
  espumoso: "Espumoso",
};
