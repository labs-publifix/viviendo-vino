// Tipos del catálogo. La fuente de verdad será Supabase (paso 3); hoy se alimentan de data/catalogo-inicial.json.

export const BOTTLE_GROUPS = ["azul", "rojo", "verde", "amarillo"] as const;
export type BottleGroup = (typeof BOTTLE_GROUPS)[number];

export const CATEGORIES = ["blancos-rosado", "tintos", "espumosos"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Wine = {
  slug: string;
  /** Nombre oficial del Excel del aliado: "Chardonnay Vento IGT 2024". */
  name: string;
  producer: string;
  category: Category;
  group: BottleGroup;
  priceCents: number;
  /** Descripción en voz de marca (la del aliado se guarda aparte como texto fuente). */
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
