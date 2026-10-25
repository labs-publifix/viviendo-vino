// Configuración editable del Quiz IA (quiz/config/*.json), tipada. Sirve en el servidor y en el navegador:
// las preguntas, los nombres de los perfiles y los textos de carga viajan en el bundle del quiz.

import perfilesJson from "@/quiz/config/perfiles.json";
import preguntasJson from "@/quiz/config/preguntas.json";
import textosJson from "@/quiz/config/textos.json";
import type { Ejes, Familia, PerfilConfig, PreguntasConfig, QuizConfig } from "./engine";

export type OpcionUI = {
  id: string;
  texto: string;
  texto_regalo?: string;
  detalle?: string;
  exclusiva?: boolean;
};
export type PreguntaUI = {
  id: string;
  tipo: "unica" | "multiple";
  max?: number;
  titulo: string;
  titulo_regalo?: string;
  ayuda?: string;
  ayuda_regalo?: string;
  opciones: OpcionUI[];
};
export type Perfil = PerfilConfig & { frase: string; frase_regalo: string; descripcion: string; guia: string };

export const PREGUNTAS = preguntasJson as unknown as PreguntasConfig & {
  comentario: { titulo: string; titulo_regalo: string; ayuda: string; max: number };
  preguntas: (PreguntasConfig["preguntas"][number] & PreguntaUI)[];
};
export const PERFILES = perfilesJson.perfiles as unknown as Perfil[];
export const TEXTOS = textosJson as unknown as {
  carga: string[];
  carga_regalo: string[];
  roles: Record<"zona" | "cerca" | "reto", string>;
  roles_ayuda: Record<"zona" | "cerca" | "reto", string>;
  invitacion_reto: string;
  avisos: Record<string, string>;
  familias: Record<Familia, string>;
  vinos: Record<string, { motivo: string; reto: string }>;
};
export const QUIZ_CONFIG: QuizConfig = { preguntas: PREGUNTAS, perfiles: PERFILES };

export const perfilById = (id: string) => PERFILES.find((p) => p.id === id);
export const PERFIL_IDS = PERFILES.map((p) => p.id);
export type { Ejes };
