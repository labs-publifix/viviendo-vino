import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSystemPrompt } from "./prompt";
import type { UvaBase } from "./calibrate";
import type { PerfilCatalogo, Reglas } from "./recommend";

// Base de conocimiento de Wine Scan (wine-scan/knowledge/, versionada en el repo). Se lee una vez por instancia.
// next.config.ts la incluye en el despliegue de /api/wine-scan.

const DIR = join(process.cwd(), "wine-scan/knowledge");
const read = (file: string) => readFileSync(join(DIR, file), "utf8");
const readJson = <T>(file: string) => JSON.parse(read(file)) as T;

type Uva = UvaBase & { nombre: string };
type Estilo = { estilo: string; descripcion: string };
type Principio = { id: string; principio: string };

const grapes = readJson<{ uvas: Uva[] }>("grapes.json");
const serving = readJson<{ estilos: Estilo[] }>("serving.json");
const pairing = readJson<{ principios: Principio[] }>("pairing-principles.json");

export const SYSTEM_PROMPT = buildSystemPrompt({
  voice: read("voice.md"),
  grapes,
  regions: readJson("regions.json"),
  labelTerms: readJson("label-terms.json"),
  serving,
  pairing,
});

export const CATALOG_PROFILES = readJson<{ vinos: PerfilCatalogo[] }>("catalog-profiles.json").vinos;
export const MATCHING_RULES = readJson<Reglas>("matching-rules.json");

export const KNOWN_IDS = {
  estilos: new Set(serving.estilos.map((e) => e.estilo)),
  principios: new Set(pairing.principios.map((p) => p.id)),
};

const UVAS = new Map(grapes.uvas.map((u) => [u.id, u.nombre]));
/** Perfil típico de cada uva, para calibrar lo que estima la IA. */
export const GRAPE_PROFILES = new Map<string, UvaBase>(grapes.uvas.map((u) => [u.id, u]));
const PRINCIPIOS = new Map(pairing.principios.map((p) => [p.id, p.principio]));

/** "pinot-grigio" → "Pinot Grigio"; un nombre libre se devuelve igual. */
export const grapeName = (id: string) => UVAS.get(id) ?? id;
export const principleName = (id: string) => PRINCIPIOS.get(id) ?? null;
