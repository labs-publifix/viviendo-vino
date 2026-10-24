import type { Guide } from "./schema";

// Respuesta pública de POST /api/wine-scan (la usa la interfaz de /wine-scan).

export type PublicGuide = Omit<Guide, "servicio" | "maridajes" | "identificacion"> & {
  identificacion: Guide["identificacion"] & { uvas_nombres: string[] };
  servicio: Omit<Guide["servicio"], "temperatura_min_c" | "temperatura_max_c"> & { temperatura_c: [number, number] };
  maridajes: (Guide["maridajes"][number] & { principio: string | null })[];
};

export type PublicRecommendation = {
  slug: string;
  nombre: string;
  precio_centavos: number;
  imagen_url: string | null;
  argumento: string;
  razon: string;
  similitud: number;
  estilo_distinto: boolean;
  aviso_nobile: boolean;
  enlace: string;
};

export type ScanResponse =
  | { ok: true; scan_id: string; guia: PublicGuide; recomendacion: PublicRecommendation | null }
  | { ok: false; error: string };
