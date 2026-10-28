import "server-only";
import { getCatalog, kitMinimo } from "@/lib/catalog/repo";
import { PERFILES, PREGUNTAS, preguntasActuales } from "@/lib/quiz/config";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Métricas de Contenido (/admin/contenido): Quiz IA y Wine Scan, con lo que ya se guarda (sin datos personales).
// Se calculan aquí sobre las filas del periodo; con el volumen de lanzamiento cabe de sobra en una consulta.

export const PERIODOS = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "todo", label: "Todo" },
] as const;
export type Periodo = (typeof PERIODOS)[number]["value"];
export const periodoDe = (v: unknown): Periodo => (PERIODOS.some((p) => p.value === v) ? (v as Periodo) : "30");

const MAX = 50000;
export const POR_PAGINA = 10;

/** Página del historial que viene en la URL (?pagina=2). Cualquier cosa rara es la 1. */
export const paginaDe = (v: unknown): number => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1;
};

export type Paginacion = { pagina: number; paginas: number; total: number; desde: number; hasta: number };

/**
 * Una página del historial, de lo más nuevo a lo más viejo. Cuenta primero (sin traer filas) para no pedir una
 * página que ya no existe; la base solo devuelve los 10 renglones de la página, sin importar cuántos haya.
 */
async function historial<T>(tabla: "quiz_sessions" | "wine_scans", columnas: string, pedida: number): Promise<{ rows: T[]; pag: Paginacion }> {
  const db = supabaseAdmin();
  const c = await db.from(tabla).select("id", { count: "exact", head: true });
  if (c.error) check({ data: null, error: c.error }, "el historial");
  const total = c.count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(pedida, paginas);
  const from = (pagina - 1) * POR_PAGINA;
  const rows = total === 0 ? [] : check(await db.from(tabla).select(columnas).order("created_at", { ascending: false }).range(from, from + POR_PAGINA - 1), "el historial");
  return { rows: rows as T[], pag: { pagina, paginas, total, desde: total ? from + 1 : 0, hasta: from + rows.length } };
}

/** Un renglón de "Lo más reciente": fecha, qué salió y qué hizo la persona después. */
export type Reciente = { id: string; at: string; titulo: string; detalle: string; marcas: string[]; tono?: "ok" | "aviso" };
const TZ = "America/Mexico_City";
const diaFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const diaCorto = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "numeric", month: "short" });

function desde(p: Periodo): string | null {
  if (p === "todo") return null;
  return new Date(Date.now() - Number(p) * 24 * 3600 * 1000).toISOString();
}

export type Barra = { key: string; label: string; value: number };
export type Dia = { dia: string; label: string; value: number };

/** Serie diaria (hora de CDMX), rellenando con ceros los días sin datos. */
function porDia(fechas: string[], p: Periodo): Dia[] {
  const counts = new Map<string, number>();
  for (const f of fechas) {
    const d = diaFmt.format(new Date(f));
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const hoy = Date.now();
  const dias = p === "todo" ? Math.min(90, Math.max(7, Math.ceil((hoy - Math.min(...fechas.map((f) => Date.parse(f)), hoy)) / 86400000) + 1)) : Number(p);
  const out: Dia[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const t = new Date(hoy - i * 86400000);
    const d = diaFmt.format(t);
    out.push({ dia: d, label: diaCorto.format(t).replace(/\./g, ""), value: counts.get(d) ?? 0 });
  }
  return out;
}

function contar(values: (string | null | undefined)[], labels: Record<string, string> = {}): Barra[] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].map(([key, value]) => ({ key, label: labels[key] ?? key, value })).sort((a, b) => b.value - a.value);
}

const opciones = (id: string, preguntas = PREGUNTAS) => Object.fromEntries((preguntas.preguntas.find((q) => q.id === id)?.opciones ?? []).map((o) => [o.id, o.texto]));
const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);

function check<T>(r: { data: T[] | null; error: { code?: string } | null }, what: string): T[] {
  if (r.error) {
    console.error(`admin/metricas: no se pudo leer ${what}`, r.error.code);
    throw new Error(`No se pudo leer ${what}.`);
  }
  return r.data ?? [];
}

type QuizReciente = { id: string; created_at: string; perfil: string; ocasion: string; presupuesto: string; agrego_carrito: boolean; correo_guardado: boolean; compartido: number | null; repeticion: boolean };
type ScanReciente = { id: string; created_at: string; accion: string; vino_detectado: string | null; confianza: string | null; slug_recomendado: string | null; feedback: number | null };

export async function getQuizMetricas(p: Periodo, pagina = 1) {
  const db = supabaseAdmin();
  const since = desde(p);
  let qs = db
    .from("quiz_sessions")
    .select("created_at, session_id, perfil, ocasion, presupuesto, agrego_carrito, correo_guardado, compartido, repeticion, texto_prearmado, narrativa_en_cache, latencia_ms")
    .limit(MAX);
  let qe = db.from("quiz_events").select("tipo, pregunta, session_id").limit(MAX);
  if (since) {
    qs = qs.gte("created_at", since);
    qe = qe.gte("created_at", since);
  }
  const qr = historial<QuizReciente>("quiz_sessions", "id, created_at, perfil, ocasion, presupuesto, agrego_carrito, correo_guardado, compartido, repeticion", pagina);
  const [sesiones, eventos, ultimos] = await Promise.all([qs, qe, qr]).then(([s, e, r]) => [check(s, "las sesiones del quiz"), check(e, "los eventos del quiz"), r] as const);
  const perfilNombre = Object.fromEntries(PERFILES.map((x) => [x.id, x.nombre]));
  const ocasionTxt = opciones("ocasion");
  // Rangos con los precios de hoy (los ids no cambian; los montos sí, con el kit más barato).
  const preguntasHoy = preguntasActuales(await getCatalog().then(kitMinimo, () => null));
  const presupuestoTxt = opciones("presupuesto", preguntasHoy);

  // Personas distintas por paso (session_id anónimo del navegador; sin él, cada evento cuenta como una).
  const distintas = (filter: (e: (typeof eventos)[number]) => boolean) => {
    const ids = new Set<string>();
    let sinId = 0;
    for (const e of eventos) {
      if (!filter(e)) continue;
      if (e.session_id) ids.add(e.session_id);
      else sinId++;
    }
    return ids.size + sinId;
  };
  // Personas distintas que llegaron a un resultado y, de ellas, cuántas hicieron cada cosa. Quien repite el quiz
  // cuenta una vez; quien vio su resultado también empezó (aunque su evento de inicio no haya llegado).
  const personas = (filter: (s: (typeof sesiones)[number]) => boolean) => {
    const ids = new Set<string>();
    let sinId = 0;
    for (const s of sesiones) {
      if (!filter(s)) continue;
      if (s.session_id) ids.add(s.session_id);
      else sinId++;
    }
    return { ids, total: ids.size + sinId, sinId };
  };
  const inicio = new Set(eventos.filter((e) => e.tipo === "inicio" && e.session_id).map((e) => e.session_id as string));
  const fin = personas(() => true);
  const empezaron = new Set([...inicio, ...fin.ids]).size + eventos.filter((e) => e.tipo === "inicio" && !e.session_id).length + fin.sinId;
  const terminaron = fin.total;
  const carrito = personas((s) => s.agrego_carrito).total;
  const correo = personas((s) => s.correo_guardado).total;
  const compartieron = personas((s) => (s.compartido ?? 0) > 0).total;

  // La pregunta 1 se muestra al empezar (su evento es "inicio"); las demás registran "pregunta" al llegar.
  const preguntas = PREGUNTAS.preguntas.map((q, i) => ({
    key: q.id,
    label: `${i + 1}. ${(q as unknown as { titulo: string }).titulo}`,
    value: i === 0 ? empezaron : distintas((e) => e.tipo === "pregunta" && e.pregunta === i + 1),
  }));
  const latencias = sesiones.map((s) => s.latencia_ms).filter((v): v is number => typeof v === "number");

  return {
    resumen: { empezaron, terminaron, carrito, correo, compartieron, tasaFin: pct(terminaron, empezaron), tasaCarrito: pct(carrito, empezaron) },
    embudo: [
      { key: "empezaron", label: "Empezaron el quiz", value: empezaron },
      { key: "terminaron", label: "Vieron su resultado", value: terminaron },
      { key: "carrito", label: "Agregaron su kit al carrito", value: carrito },
      { key: "correo", label: "Guardaron su resultado por correo", value: correo },
    ],
    preguntas,
    perfiles: contar(
      sesiones.map((s) => s.perfil),
      perfilNombre,
    ),
    // Historial completo (sin importar el periodo), paginado: dice si el quiz se está usando hoy.
    ahora: Date.now(),
    historial: ultimos.pag,
    recientes: ultimos.rows.map(
      (r): Reciente => ({
        id: r.id,
        at: r.created_at,
        titulo: perfilNombre[r.perfil] ?? r.perfil,
        detalle: [ocasionTxt[r.ocasion] ?? r.ocasion, presupuestoTxt[r.presupuesto] ?? r.presupuesto].filter(Boolean).join(" · "),
        marcas: [
          r.agrego_carrito && "Al carrito",
          r.correo_guardado && "Guardó por correo",
          (r.compartido ?? 0) > 0 && "Compartió",
          r.repeticion && "Repitió",
        ].filter((x): x is string => Boolean(x)),
      }),
    ),
    ocasiones: contar(
      sesiones.map((s) => s.ocasion),
      opciones("ocasion"),
    ),
    presupuestos: contar(
      sesiones.map((s) => s.presupuesto),
      presupuestoTxt,
    ),
    porDia: porDia(
      sesiones.map((s) => s.created_at),
      p,
    ),
    tecnico: {
      latenciaMedia: latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null,
      textoRespaldo: pct(sesiones.filter((s) => s.texto_prearmado).length, terminaron),
      narrativaCache: pct(sesiones.filter((s) => s.narrativa_en_cache).length, terminaron),
      repeticiones: sesiones.filter((s) => s.repeticion).length,
    },
  };
}

const ACCIONES: Record<string, string> = { ok: "Guía completa", pedir_otra_foto: "Pidió otra foto", no_es_vino: "No era vino" };
const CONFIANZA: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

export async function getScanMetricas(p: Periodo, pagina = 1) {
  const since = desde(p);
  const db = supabaseAdmin();
  let q = db.from("wine_scans").select("created_at, accion, vino_detectado, confianza, grupo, slug_recomendado, feedback, latencia_ms").limit(MAX);
  if (since) q = q.gte("created_at", since);
  const [scansR, hist] = await Promise.all([q, historial<ScanReciente>("wine_scans", "id, created_at, accion, vino_detectado, confianza, slug_recomendado, feedback", pagina)]);
  const scans = check(scansR, "los escaneos");
  const ultimos = hist.rows;
  const slugs = [...new Set(ultimos.map((u) => u.slug_recomendado).filter((x): x is string => Boolean(x)))];
  const nombres = new Map<string, string>();
  if (slugs.length) {
    const r = await db.from("productos").select("slug, nombre_oficial").in("slug", slugs);
    for (const x of r.data ?? []) nombres.set(x.slug, x.nombre_oficial);
  }
  const ok = scans.filter((s) => s.accion === "ok");
  const errores = scans.filter((s) => String(s.accion).startsWith("error:")).length;
  const meSirvio = scans.filter((s) => s.feedback === 1).length;
  const noMeSirvio = scans.filter((s) => s.feedback === -1).length;
  const latencias = scans.map((s) => s.latencia_ms).filter((v): v is number => typeof v === "number");

  // Vinos más escaneados: se agrupan sin distinguir mayúsculas; se muestra la forma más frecuente.
  const formas = new Map<string, Map<string, number>>();
  for (const s of ok) {
    const v = (s.vino_detectado ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    const m = formas.get(k) ?? new Map<string, number>();
    m.set(v, (m.get(v) ?? 0) + 1);
    formas.set(k, m);
  }
  const vinos: Barra[] = [...formas.entries()]
    .map(([k, m]) => ({ key: k, label: [...m.entries()].sort((a, b) => b[1] - a[1])[0][0], value: [...m.values()].reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    resumen: {
      total: scans.length,
      guias: ok.length,
      tasaGuia: pct(ok.length, scans.length),
      conRecomendacion: pct(ok.filter((s) => s.slug_recomendado).length, ok.length),
      meSirvio,
      noMeSirvio,
      tasaSirvio: pct(meSirvio, meSirvio + noMeSirvio),
    },
    resultados: [
      ...contar(
        scans.map((s) => (String(s.accion).startsWith("error:") ? null : s.accion)),
        ACCIONES,
      ),
      ...(errores ? [{ key: "error", label: "Error al leer", value: errores }] : []),
    ],
    vinos,
    // Orden fijo de la escala (no por cantidad), para leerla igual en cada periodo.
    confianza: contar(
      ok.map((s) => s.confianza),
      CONFIANZA,
    ).sort((a, b) => ["alta", "media", "baja"].indexOf(a.key) - ["alta", "media", "baja"].indexOf(b.key)),
    porDia: porDia(
      scans.map((s) => s.created_at),
      p,
    ),
    tecnico: { latenciaMedia: latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null, errores },
    ahora: Date.now(),
    historial: hist.pag,
    recientes: ultimos.map((u): Reciente => {
      const error = String(u.accion).startsWith("error:");
      const ok = u.accion === "ok";
      const reco = u.slug_recomendado ? (nombres.get(u.slug_recomendado) ?? u.slug_recomendado) : null;
      return {
        id: u.id,
        at: u.created_at,
        titulo: ok && u.vino_detectado ? u.vino_detectado : (ACCIONES[u.accion] ?? (error ? "Error al leer" : u.accion)),
        detalle: ok ? [CONFIANZA[u.confianza ?? ""] && `Confianza ${CONFIANZA[u.confianza ?? ""].toLowerCase()}`, reco && `Recomendó ${reco}`].filter(Boolean).join(" · ") : "",
        marcas: [ok ? "Guía completa" : null, u.feedback === 1 ? "Le sirvió" : u.feedback === -1 ? "No le sirvió" : null].filter((x): x is string => Boolean(x)),
        tono: ok ? "ok" : "aviso",
      };
    }),
  };
}
