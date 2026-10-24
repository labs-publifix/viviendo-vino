// Recomendación de Wine Scan (wine-scan/knowledge/matching-rules.json): la IA solo describe el vino escaneado;
// este código decide si algún vino del catálogo se le parece. Lógica pura, sin imports, para usarla igual en el
// servidor y en las pruebas (tests/wine-scan.test.mjs).

export type Perfil = { cuerpo: number; acidez: number; tanino: number; dulzor: number; intensidad: number };
export type GrupoVino = "tinto" | "blanco" | "rosado" | "espumoso" | "dulce" | "fortificado" | "naranja";

export type Escaneado = {
  grupo: GrupoVino;
  perfil: Perfil;
  uvas: string[];
  pais: string | null;
  metodo_espumoso?: "tradicional" | "tanque" | "desconocido" | null;
  /** Nombre y denominación leídos, para avisos como el del Vino Nobile di Montepulciano. */
  texto?: string;
};

export type PerfilCatalogo = {
  slug: string;
  nombre: string;
  pais: string;
  region: string;
  uvas: string[];
  grupo: string;
  perfil: Perfil;
  perfil_confianza: "alta" | "media" | "baja";
  argumento: string;
};

export type Reglas = {
  pesos: Perfil;
  umbral_minimo: number;
};

export type Candidato = PerfilCatalogo & {
  /** Precio por botella en centavos (Supabase). Solo para desempatar. */
  precioCentavos: number;
};

export type Recomendacion = {
  slug: string;
  score: number;
  compartenUva: boolean;
  /** Escaneado de método tradicional y sugerido de método tanque. */
  estiloDistinto: boolean;
  /** El escaneado es Vino Nobile di Montepulciano y el sugerido, Montepulciano d'Abruzzo. */
  avisoNobile: boolean;
  razon: string;
};

const GRUPOS_CON_RECOMENDACION = new Set(["tinto", "blanco", "rosado", "espumoso"]);
const EJES: (keyof Perfil)[] = ["cuerpo", "acidez", "tanino", "dulzor", "intensidad"];
/** Los empates se comparan a 3 decimales, como en los casos de prueba. */
const redondear = (n: number) => Math.round(n * 1000) / 1000;
const normaliza = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

/** Puntaje de parecido entre el escaneado y un vino del catálogo, o null si no pasa las puertas duras. */
export function similitud(e: Escaneado, c: PerfilCatalogo, reglas: Reglas): number | null {
  if (!GRUPOS_CON_RECOMENDACION.has(e.grupo) || c.grupo !== e.grupo) return null;
  const p = e.perfil;
  const q = c.perfil;
  if (Math.abs(p.cuerpo - q.cuerpo) > 1 || Math.abs(p.dulzor - q.dulzor) > 1) return null;
  if (e.grupo === "tinto" && Math.abs(p.tanino - q.tanino) > 1) return null;

  const ejes = EJES.filter((k) => k !== "tanino" || e.grupo === "tinto");
  const suma = ejes.reduce((s, k) => s + reglas.pesos[k] * Math.abs(p[k] - q[k]), 0);
  const pesos = ejes.reduce((s, k) => s + reglas.pesos[k], 0);
  let score = 1 - suma / pesos / 4;
  if (e.uvas.some((u) => c.uvas.includes(u))) score += 0.05;
  if (e.pais && normaliza(e.pais) === normaliza(c.pais)) score += 0.03;
  return redondear(Math.min(score, 1));
}

const NIVELES: Record<keyof Perfil, string[]> = {
  cuerpo: ["", "ligero", "ligero a medio", "medio", "medio-alto", "pleno"],
  acidez: ["", "suave", "moderada", "media", "fresca", "muy fresca"],
  tanino: ["sin tanino", "muy suave", "suave", "medio", "firme", "muy marcado"],
  dulzor: ["", "seco", "seco con fruta madura", "semiseco", "semidulce", "dulce"],
  intensidad: ["", "discreta", "suave", "media", "intensa", "muy intensa"],
};
const NOMBRE_GRUPO: Record<string, string> = { tinto: "tintos", blanco: "blancos", rosado: "rosados", espumoso: "espumosos" };

/** Razón objetiva y corta: qué rasgos comparten, en palabras simples. */
function razon(e: Escaneado, c: PerfilCatalogo, nombreUva: (id: string) => string): string {
  const ejes: (keyof Perfil)[] = e.grupo === "tinto" ? ["cuerpo", "tanino", "acidez"] : ["cuerpo", "acidez", "dulzor"];
  const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`);
  // Mismo nivel: se nombra el nivel. A un punto de distancia: solo se dice que se parecen.
  const iguales = ejes.filter((k) => e.perfil[k] === c.perfil[k]).map((k) => (k === "dulzor" ? NIVELES.dulzor[c.perfil.dulzor] : `${k} ${NIVELES[k][c.perfil[k]]}`));
  const cerca = ejes.filter((k) => Math.abs(e.perfil[k] - c.perfil[k]) === 1);
  let texto = `Los dos son ${NOMBRE_GRUPO[c.grupo]}`;
  if (iguales.length > 0) texto += ` de ${lista(iguales)}`;
  if (cerca.length > 0) texto += `${iguales.length > 0 ? " y" : ""} se parecen en ${lista(cerca)}`;
  texto += ".";
  const uva = e.uvas.find((u) => c.uvas.includes(u));
  if (uva) texto += ` Comparten la uva ${nombreUva(uva)}.`;
  return texto;
}

/**
 * Máximo una recomendación. Puertas duras, puntaje con pesos, bonos por uva y país, umbral mínimo y desempate:
 * 1) el que comparte uva con el escaneado; 2) el de menor precio. Excluye perfiles de confianza baja.
 * Los candidatos llegan ya filtrados por existencia y disponibilidad en Supabase.
 */
export function recommendFromCatalog(
  e: Escaneado,
  candidatos: Candidato[],
  reglas: Reglas,
  nombreUva: (id: string) => string = (id) => id,
): Recomendacion | null {
  const puntuados = candidatos
    .filter((c) => c.perfil_confianza !== "baja")
    .map((c) => ({ c, score: similitud(e, c, reglas), uva: e.uvas.some((u) => c.uvas.includes(u)) }))
    .filter((x): x is { c: Candidato; score: number; uva: boolean } => x.score !== null && x.score >= reglas.umbral_minimo)
    .sort((a, b) => b.score - a.score || Number(b.uva) - Number(a.uva) || a.c.precioCentavos - b.c.precioCentavos);

  const mejor = puntuados[0];
  if (!mejor) return null;
  const { c } = mejor;
  const texto = normaliza(e.texto);
  return {
    slug: c.slug,
    score: mejor.score,
    compartenUva: mejor.uva,
    estiloDistinto: e.grupo === "espumoso" && e.metodo_espumoso === "tradicional" && c.grupo === "espumoso" && c.uvas.includes("glera"),
    avisoNobile: texto.includes("nobiledimontepulciano") && c.uvas.includes("montepulciano"),
    razon: razon(e, c, nombreUva),
  };
}
