// Motor del Quiz IA: el código decide. Convierte las respuestas en un perfil numérico, asigna uno de los 6
// perfiles y arma el kit de 6 con la regla 3-2-1. La compatibilidad del kit es la del armador
// (lib/kit/rules.ts: 6 botellas de un mismo grupo), importada, no copiada. Lógica pura y determinista: las
// mismas respuestas dan siempre el mismo kit. Se usa igual en el servidor y en las pruebas (tests/quiz.test.mjs).

import { KIT_SIZE, validateKit, type KitWine } from "../kit/rules.ts";

export type Eje = "cuerpo" | "acidez" | "tanino" | "dulzor" | "intensidad";
export type Ejes = Record<Eje, number>;
/** Familia de color del quiz: "blanco" incluye el rosado (pregunta 2: "Blanco o rosado"). */
export type Familia = "blanco" | "tinto" | "espumoso";
export type Rol = "zona" | "cerca" | "reto";

const EJES: Eje[] = ["cuerpo", "acidez", "tanino", "dulzor", "intensidad"];

// --- Configuración (quiz/config/*.json) ---

export type Opcion = {
  id: string;
  texto: string;
  perfil?: Partial<Ejes>;
  familias?: Familia[];
  exclusiva?: boolean;
  reto?: number;
  min_centavos?: number;
  max_centavos?: number | null;
};
export type Pregunta = { id: string; tipo: "unica" | "multiple"; max?: number; opciones: Opcion[] };
export type PreguntasConfig = { perfil_base: Ejes; preguntas: Pregunta[] };
export type PerfilConfig = { id: string; nombre: string; familia: Familia; vector: Ejes; aromas: string[] };
export type QuizConfig = { preguntas: PreguntasConfig; perfiles: PerfilConfig[] };

export type Answers = {
  ocasion: string;
  colores: string[];
  cafe: string;
  limonada: string;
  textura: string;
  aromas: string[];
  aventura: string;
  presupuesto: string;
};

/** Restricciones permitidas que salen del comentario libre (la IA las propone, el código las acota). */
export type Constraints = {
  ocasion?: string | null;
  plato?: string | null;
  personas?: number | null;
  color?: Familia | null;
  presupuestoMaxCentavos?: number | null;
};

// --- Catálogo (perfiles de catalog-profiles.json + quiz/config/vinos.json + precio y stock de Supabase) ---

export type QuizWine = {
  slug: string;
  nombre: string;
  /** Grupo del armador (azul, rojo, verde, amarillo): define la compatibilidad del kit. */
  grupo: string;
  familia: Familia;
  perfil: Ejes;
  aromas: string[];
  ocasiones: string[];
  platos: string[];
  rol: "basico" | "descubrimiento" | "especial";
  priceCents: number;
  available: boolean;
};
export type PresetKit = { slug: string; items: { slug: string; quantity: number }[] };
export type QuizCatalog = { wines: QuizWine[]; presets: PresetKit[] };

// --- Resultado ---

export type KitLine = { slug: string; cantidad: number; rol: Rol; score: number };
export type Kit = { familia: Familia; grupo: string; lineas: KitLine[]; totalCentavos: number; afinidad: number };
export type Aviso =
  | { tipo: "dulce" }
  | { tipo: "sin_coincidencia" }
  | { tipo: "presupuesto"; familia: Familia; minimoCentavos: number; alternativa: Familia }
  | { tipo: "presupuesto_sin_alternativa"; minimoCentavos: number }
  | { tipo: "color_comentario" };
export type KitResult = {
  perfil: string;
  vector: Ejes;
  familias: Familia[];
  retos: number;
  kit: Kit | null;
  alterno: Kit | null;
  prearmado: string | null;
  avisos: Aviso[];
};

// --- Parámetros del motor ---

const PESOS: Ejes = { cuerpo: 1, acidez: 1, tanino: 1, dulzor: 0.75, intensidad: 0.75 };
const BONO_AROMA = 0.04;
const BONO_OCASION = 0.03;
const BONO_ROL = 0.03;
const BONO_PLATO = 0.05;
/** Preferencia suave por un kit dentro del rango de presupuesto elegido (el tope es duro). */
const BONO_RANGO = 0.06;
/** Un grupo de solo 2 vinos no admite la regla 3-2-1: pierde frente a otros si la persona pidió variedad. */
const CASTIGO_POCA_VARIEDAD = 0.03;
/** Distancia máxima de puntaje para que el segundo vino comparta "tu zona" con el mejor. */
const BRECHA_ZONA = 0.06;
/** En grupos de 2 vinos (Bollicine, Rocca): 3 y 3 si están así de cerca; si no, 4 y 2. */
const BRECHA_PAR = 0.05;
const MAX_POR_VINO = 3;
/** Debajo de esta afinidad del mejor vino, el resultado avisa que nada encaja del todo. */
const AFINIDAD_MINIMA = 0.72;
const DULZOR_DULCE = 2.6;
const ROL_POR_OCASION: Record<string, QuizWine["rol"]> = { diario: "basico", regalo: "especial", explorar: "descubrimiento" };
const ORDEN_ROL: Record<Rol, number> = { zona: 0, cerca: 1, reto: 2 };

const r4 = (n: number) => Math.round(n * 10000) / 10000;
const r2 = (n: number) => Math.round(n * 100) / 100;

function option(config: PreguntasConfig, pregunta: string, id: string): Opcion | undefined {
  return config.preguntas.find((p) => p.id === pregunta)?.opciones.find((o) => o.id === id);
}

/** Perfil numérico del usuario: promedio, por eje, de lo que aportan sus respuestas; sin aportes, el valor base. */
export function userProfile(answers: Answers, config: PreguntasConfig): Ejes {
  const aportes: Record<Eje, number[]> = { cuerpo: [], acidez: [], tanino: [], dulzor: [], intensidad: [] };
  const elegidas = [
    option(config, "cafe", answers.cafe),
    option(config, "limonada", answers.limonada),
    option(config, "textura", answers.textura),
    ...answers.aromas.map((a) => option(config, "aromas", a)),
  ];
  for (const o of elegidas) for (const eje of EJES) if (o?.perfil?.[eje] !== undefined) aportes[eje].push(o.perfil[eje]!);
  const out = { ...config.perfil_base };
  for (const eje of EJES) if (aportes[eje].length) out[eje] = r2(aportes[eje].reduce((s, n) => s + n, 0) / aportes[eje].length);
  return out;
}

export function chosenFamilies(answers: Answers, config: PreguntasConfig): Familia[] {
  const set = new Set<Familia>();
  for (const c of answers.colores) for (const f of option(config, "colores", c)?.familias ?? []) set.add(f);
  // Orden fijo para que el resultado no dependa del orden en que se marcaron.
  return (["tinto", "blanco", "espumoso"] as Familia[]).filter((f) => set.has(f));
}

/** Perfil más cercano (distancia ponderada menos un bono por aromas en común); empate: el primero de la configuración. */
export function assignProfile(vector: Ejes, familias: Familia[], aromas: string[], perfiles: PerfilConfig[]): PerfilConfig {
  const candidatos = perfiles.filter((p) => familias.includes(p.familia));
  const lista = candidatos.length ? candidatos : perfiles;
  let mejor = lista[0];
  let mejorD = Infinity;
  for (const p of lista) {
    const d = EJES.reduce((s, e) => s + PESOS[e] * Math.abs(vector[e] - p.vector[e]), 0) - 0.25 * aromas.filter((a) => p.aromas.includes(a)).length;
    if (d < mejorD - 1e-9) {
      mejor = p;
      mejorD = d;
    }
  }
  return mejor;
}

/** Parecido del vino al perfil del usuario, de 0 a 1. El tanino solo cuenta en tintos (los demás no tienen). */
export function affinity(u: Ejes, w: QuizWine): number {
  const ejes = EJES.filter((e) => e !== "tanino" || w.familia === "tinto");
  const suma = ejes.reduce((s, e) => s + PESOS[e] * Math.abs(u[e] - w.perfil[e]), 0);
  const pesos = ejes.reduce((s, e) => s + PESOS[e], 0);
  return r4(1 - suma / pesos / 4);
}

type Contexto = { vector: Ejes; aromas: string[]; ocasiones: string[]; plato: string | null };

/** Puntaje: afinidad + bonos por familia aromática, ocasión (y el rol que le va) y tipo de plato del comentario. */
export function wineScore(w: QuizWine, ctx: Contexto): number {
  let s = affinity(ctx.vector, w);
  s += BONO_AROMA * Math.min(2, ctx.aromas.filter((a) => w.aromas.includes(a)).length);
  if (ctx.ocasiones.some((o) => w.ocasiones.includes(o))) s += BONO_OCASION;
  if (ctx.ocasiones.some((o) => ROL_POR_OCASION[o] === w.rol)) s += BONO_ROL;
  if (ctx.plato && w.platos.includes(ctx.plato)) s += BONO_PLATO;
  return r4(s);
}

type Rankeado = { w: QuizWine; score: number };

/** Orden estable: puntaje, luego el más barato, luego el slug. */
const porRanking = (a: Rankeado, b: Rankeado) => b.score - a.score || a.w.priceCents - b.w.priceCents || a.w.slug.localeCompare(b.w.slug);

type Botellas = Map<string, { cantidad: number; rol: Rol }[]>;

function cuenta(b: Botellas, slug: string): number {
  return (b.get(slug) ?? []).reduce((s, x) => s + x.cantidad, 0);
}
function poner(b: Botellas, slug: string, rol: Rol, cantidad = 1) {
  const list = b.get(slug) ?? [];
  const same = list.find((x) => x.rol === rol);
  if (same) same.cantidad += cantidad;
  else list.push({ rol, cantidad });
  b.set(slug, list);
}
function quitar(b: Botellas, slug: string): Rol {
  const list = b.get(slug)!;
  // Se quita primero la botella del rol de menor prioridad (reto, luego cerca).
  list.sort((x, y) => ORDEN_ROL[y.rol] - ORDEN_ROL[x.rol]);
  const item = list[0];
  item.cantidad -= 1;
  if (item.cantidad === 0) list.shift();
  if (list.length === 0) b.delete(slug);
  return item.rol;
}
const total = (b: Botellas, price: Map<string, number>) => [...b].reduce((s, [slug]) => s + cuenta(b, slug) * price.get(slug)!, 0);

/** Arma el kit de un grupo (vinos ya filtrados por familia y stock) con la regla 3-2-1 y el tope de presupuesto. */
function kitForGroup(ranked: Rankeado[], retos: number, tope: number | null): Botellas | null {
  const n = ranked.length;
  if (n === 0) return null;
  const b: Botellas = new Map();
  const maxPorVino = n <= 2 ? KIT_SIZE : MAX_POR_VINO;

  if (n === 1) {
    poner(b, ranked[0].w.slug, "zona", KIT_SIZE);
  } else if (n === 2) {
    // Grupos de 2 vinos (Bollicine, Rocca): la regla 3-2-1 se adapta a 3 y 3, o 4 y 2 según la cercanía.
    const [a, c] = ranked;
    const par = a.score - c.score < BRECHA_PAR;
    poner(b, a.w.slug, "zona", par ? 3 : 4);
    poner(b, c.w.slug, "cerca", par ? 3 : 2);
  } else {
    // 3 de "tu zona": el mejor dos veces y el segundo si está igual de cerca; si no, el mejor tres veces.
    const [a, c] = ranked;
    if (a.score - c.score <= BRECHA_ZONA) {
      poner(b, a.w.slug, "zona", 2);
      poner(b, c.w.slug, "zona", 1);
    } else {
      poner(b, a.w.slug, "zona", 3);
    }
    // Reto: los vinos sin usar más alejados del perfil (invitación a probar algo distinto, no el peor del catálogo:
    // todos ya pasaron las puertas duras de familia, grupo y stock).
    const libres = ranked.filter((x) => !b.has(x.w.slug));
    const retoVinos = [...libres].reverse().slice(0, retos);
    for (let i = 0; i < retos && retoVinos.length > 0; i++) poner(b, retoVinos[i % retoVinos.length].w.slug, "reto");
    // Cerca de tu zona: los siguientes en el ranking, una botella cada uno; si se acaban, se repiten (primero los
    // de "cerca", luego los de "tu zona") sin pasar de 3 por vino.
    let faltan = KIT_SIZE - [...b.keys()].reduce((s, k) => s + cuenta(b, k), 0);
    const cercanos = ranked.filter((x) => !b.has(x.w.slug));
    for (const v of cercanos) {
      if (faltan === 0) break;
      poner(b, v.w.slug, "cerca");
      faltan--;
    }
    const repetir = [...cercanos, ...ranked.filter((x) => !cercanos.includes(x) && !retoVinos.includes(x)), ...retoVinos];
    for (let vuelta = 0; faltan > 0 && vuelta < KIT_SIZE; vuelta++) {
      for (const v of repetir) {
        if (faltan === 0) break;
        if (cuenta(b, v.w.slug) < maxPorVino) {
          poner(b, v.w.slug, "cerca");
          faltan--;
        }
      }
    }
    if (faltan > 0) return null;
  }

  if (tope === null) return b;
  // Presupuesto: cambia botellas caras por otras más baratas del mismo grupo, perdiendo el menor puntaje posible.
  const price = new Map(ranked.map((x) => [x.w.slug, x.w.priceCents]));
  const score = new Map(ranked.map((x) => [x.w.slug, x.score]));
  for (let paso = 0; paso < 60 && total(b, price) > tope; paso++) {
    let mejor: { de: string; a: string; perdida: number; ahorro: number } | null = null;
    for (const de of [...b.keys()].sort()) {
      // La botella que sale es la del rol de menor prioridad de ese vino (ver quitar()).
      const rolSale = b.get(de)!.map((x) => x.rol).sort((x, y) => ORDEN_ROL[y] - ORDEN_ROL[x])[0];
      for (const x of ranked) {
        const a = x.w.slug;
        const ahorro = price.get(de)! - price.get(a)!;
        if (a === de || ahorro <= 0 || cuenta(b, a) >= maxPorVino) continue;
        // Un reto debe seguir siendo un vino distinto: se prefiere uno que no esté ya en la caja.
        const repite = rolSale === "reto" && b.has(a) ? 1 : 0;
        const perdida = r4(score.get(de)! - score.get(a)! + repite);
        if (!mejor || perdida < mejor.perdida || (perdida === mejor.perdida && (ahorro > mejor.ahorro || (ahorro === mejor.ahorro && de + a < mejor.de + mejor.a)))) {
          mejor = { de, a, perdida, ahorro };
        }
      }
    }
    if (!mejor) return null;
    const rol = quitar(b, mejor.de);
    poner(b, mejor.a, rol);
  }
  return total(b, price) <= tope ? b : null;
}

function toKit(b: Botellas, ranked: Rankeado[], familia: Familia, grupo: string): Kit {
  const info = new Map(ranked.map((x) => [x.w.slug, x]));
  const lineas: KitLine[] = [...b].map(([slug, roles]) => {
    // Un vino con botellas de varios roles se muestra con el de más prioridad (tu zona > cerca > reto).
    const rol = roles.map((r) => r.rol).sort((x, y) => ORDEN_ROL[x] - ORDEN_ROL[y])[0];
    return { slug, cantidad: roles.reduce((s, r) => s + r.cantidad, 0), rol, score: info.get(slug)!.score };
  });
  lineas.sort((x, y) => ORDEN_ROL[x.rol] - ORDEN_ROL[y.rol] || y.score - x.score || x.slug.localeCompare(y.slug));
  const totalCentavos = lineas.reduce((s, l) => s + l.cantidad * info.get(l.slug)!.w.priceCents, 0);
  const afinidad = r4(lineas.reduce((s, l) => s + l.cantidad * l.score, 0) / KIT_SIZE);
  return { familia, grupo, lineas, totalCentavos, afinidad };
}

type Opciones = { retos: number; tope: number | null; minimo: number; ctx: Contexto };

/** Mejor kit válido de una familia: prueba cada grupo del armador y se queda con el de mejor puntaje. */
function bestKitForFamily(familia: Familia, catalog: QuizCatalog, op: Opciones): { kit: Kit | null; minimoCentavos: number } {
  const vinos = catalog.wines.filter((w) => w.familia === familia && w.available);
  const grupos = [...new Set(vinos.map((w) => w.grupo))].sort();
  const kitWines = new Map<string, KitWine>(catalog.wines.map((w) => [w.slug, { slug: w.slug, name: w.nombre, group: w.grupo, priceCents: w.priceCents, available: w.available }]));
  let mejor: { kit: Kit; valor: number } | null = null;
  let minimoCentavos = Infinity;
  for (const grupo of grupos) {
    const ranked = vinos
      .filter((w) => w.grupo === grupo)
      .map((w) => ({ w, score: wineScore(w, op.ctx) }))
      .sort(porRanking);
    minimoCentavos = Math.min(minimoCentavos, Math.min(...ranked.map((x) => x.w.priceCents)) * KIT_SIZE);
    const b = kitForGroup(ranked, op.retos, op.tope);
    if (!b) continue;
    const kit = toKit(b, ranked, familia, grupo);
    // Verificación final con la misma regla del armador y del carrito.
    const check = validateKit(kit.lineas.map((l) => ({ slug: l.slug, quantity: l.cantidad })), kitWines);
    if (!check.ok || check.totalCents !== kit.totalCentavos) continue;
    const variedad = ranked.length < 3 && op.retos > 0 ? CASTIGO_POCA_VARIEDAD : 0;
    const valor = r4(kit.afinidad + (kit.totalCentavos >= op.minimo ? BONO_RANGO : 0) - variedad);
    if (!mejor || valor > mejor.valor || (valor === mejor.valor && (kit.totalCentavos < mejor.kit.totalCentavos || (kit.totalCentavos === mejor.kit.totalCentavos && grupo < mejor.kit.grupo)))) {
      mejor = { kit, valor };
    }
  }
  return { kit: mejor?.kit ?? null, minimoCentavos: Number.isFinite(minimoCentavos) ? minimoCentavos : 0 };
}

/** Punto de entrada: respuestas + restricciones del comentario + catálogo → perfil, kit, kit alterno y avisos. */
export function buildKit(answers: Answers, constraints: Constraints, catalog: QuizCatalog, config: QuizConfig): KitResult {
  const vector = userProfile(answers, config.preguntas);
  const familias = chosenFamilies(answers, config.preguntas);
  const avisos: Aviso[] = [];

  // El color del comentario solo elige entre lo que la persona marcó; nunca abre otra familia.
  const color = constraints.color && familias.includes(constraints.color) && familias.length > 1 ? constraints.color : null;
  if (color) avisos.push({ tipo: "color_comentario" });
  const perfil = assignProfile(vector, color ? [color] : familias, answers.aromas, config.perfiles);

  const presupuesto = option(config.preguntas, "presupuesto", answers.presupuesto);
  let tope = presupuesto?.max_centavos ?? null;
  // El comentario solo puede bajar el tope, nunca subirlo, y con un mínimo razonable.
  const deComentario = constraints.presupuestoMaxCentavos ?? null;
  if (deComentario !== null && deComentario >= 150000 && (tope === null || deComentario < tope)) tope = deComentario;
  const retos = option(config.preguntas, "aventura", answers.aventura)?.reto ?? 1;
  const ocasiones = [answers.ocasion, ...(constraints.ocasion ? [constraints.ocasion] : [])];
  const op: Opciones = {
    retos,
    tope,
    minimo: presupuesto?.min_centavos ?? 0,
    ctx: { vector, aromas: answers.aromas, ocasiones, plato: constraints.plato ?? null },
  };

  const principal = color ?? perfil.familia;
  const orden = [principal, ...familias.filter((f) => f !== principal)];
  const intentos = new Map(orden.map((f) => [f, bestKitForFamily(f, catalog, op)]));

  let kit = intentos.get(principal)!.kit;
  if (!kit) {
    // Lo elegido no cabe en el presupuesto: lo más cercano que sí cabe, primero entre lo que marcó.
    const minimo = intentos.get(principal)!.minimoCentavos;
    const otras = (["blanco", "tinto", "espumoso"] as Familia[]).filter((f) => f !== principal);
    const cercanas = otras
      .map((f) => ({ f, d: distanciaPerfil(perfil, f, config.perfiles), elegida: familias.includes(f) }))
      .sort((a, b) => Number(b.elegida) - Number(a.elegida) || a.d - b.d);
    for (const { f } of cercanas) {
      const intento = intentos.get(f) ?? bestKitForFamily(f, catalog, op);
      if (intento.kit) {
        kit = intento.kit;
        avisos.push({ tipo: "presupuesto", familia: principal, minimoCentavos: minimo, alternativa: f });
        break;
      }
    }
    if (!kit) avisos.push({ tipo: "presupuesto_sin_alternativa", minimoCentavos: minimo });
  }

  // Segundo kit: la otra familia que marcó, si cabe en el presupuesto.
  let alterno: Kit | null = null;
  for (const f of orden) {
    if (!kit || f === kit.familia) continue;
    const k = intentos.get(f)!.kit;
    if (k && (!alterno || k.afinidad > alterno.afinidad)) alterno = k;
  }

  if (kit) {
    const mejorAfinidad = Math.max(...catalog.wines.filter((w) => w.available && w.familia === kit!.familia).map((w) => affinity(vector, w)));
    if (vector.dulzor >= DULZOR_DULCE) avisos.push({ tipo: "dulce" });
    else if (mejorAfinidad < AFINIDAD_MINIMA) avisos.push({ tipo: "sin_coincidencia" });
  }

  return { perfil: perfil.id, vector, familias, retos, kit, alterno, prearmado: kit ? presetShortcut(kit, catalog, op) : null, avisos };
}

function distanciaPerfil(perfil: PerfilConfig, familia: Familia, perfiles: PerfilConfig[]): number {
  const deFamilia = perfiles.filter((p) => p.familia === familia);
  return Math.min(...deFamilia.map((p) => EJES.reduce((s, e) => s + Math.abs(perfil.vector[e] - p.vector[e]), 0)));
}

/** Kit prearmado que encaja casi igual de bien que el personalizado: se ofrece como opción de un clic. */
function presetShortcut(kit: Kit, catalog: QuizCatalog, op: Opciones): string | null {
  const bySlug = new Map(catalog.wines.map((w) => [w.slug, w]));
  for (const p of [...catalog.presets].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const wines = p.items.map((i) => bySlug.get(i.slug));
    if (wines.some((w) => !w || !w.available || w.familia !== kit.familia || w.grupo !== kit.grupo)) continue;
    const count = p.items.reduce((s, i) => s + i.quantity, 0);
    const totalP = p.items.reduce((s, i) => s + i.quantity * bySlug.get(i.slug)!.priceCents, 0);
    if (count !== KIT_SIZE || (op.tope !== null && totalP > op.tope)) continue;
    const mismo = p.items.length === kit.lineas.length && p.items.every((i) => kit.lineas.some((l) => l.slug === i.slug && l.cantidad === i.quantity));
    if (mismo) continue;
    const afin = p.items.reduce((s, i) => s + i.quantity * wineScore(bySlug.get(i.slug)!, op.ctx), 0) / KIT_SIZE;
    if (afin >= kit.afinidad - 0.02) return p.slug;
  }
  return null;
}
