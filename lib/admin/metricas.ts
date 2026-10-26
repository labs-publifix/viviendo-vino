import "server-only";
import { PERFILES, PREGUNTAS } from "@/lib/quiz/config";
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

const opciones = (id: string) => Object.fromEntries((PREGUNTAS.preguntas.find((q) => q.id === id)?.opciones ?? []).map((o) => [o.id, o.texto]));
const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);

function check<T>(r: { data: T[] | null; error: { code?: string } | null }, what: string): T[] {
  if (r.error) {
    console.error(`admin/metricas: no se pudo leer ${what}`, r.error.code);
    throw new Error(`No se pudo leer ${what}.`);
  }
  return r.data ?? [];
}

export async function getQuizMetricas(p: Periodo) {
  const db = supabaseAdmin();
  const since = desde(p);
  let qs = db
    .from("quiz_sessions")
    .select("created_at, perfil, ocasion, presupuesto, agrego_carrito, correo_guardado, compartido, repeticion, texto_prearmado, narrativa_en_cache, latencia_ms")
    .limit(MAX);
  let qe = db.from("quiz_events").select("tipo, pregunta, session_id").limit(MAX);
  if (since) {
    qs = qs.gte("created_at", since);
    qe = qe.gte("created_at", since);
  }
  const [sesiones, eventos] = await Promise.all([qs, qe]).then(([s, e]) => [check(s, "las sesiones del quiz"), check(e, "los eventos del quiz")] as const);

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
  const empezaron = distintas((e) => e.tipo === "inicio");
  const terminaron = sesiones.length;
  const carrito = sesiones.filter((s) => s.agrego_carrito).length;
  const correo = sesiones.filter((s) => s.correo_guardado).length;
  const compartieron = sesiones.filter((s) => (s.compartido ?? 0) > 0).length;

  const preguntas = PREGUNTAS.preguntas.map((q, i) => ({ key: q.id, label: `${i + 1}. ${(q as unknown as { titulo: string }).titulo}`, value: distintas((e) => e.tipo === "pregunta" && e.pregunta === i + 1) }));
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
      Object.fromEntries(PERFILES.map((x) => [x.id, x.nombre])),
    ),
    ocasiones: contar(
      sesiones.map((s) => s.ocasion),
      opciones("ocasion"),
    ),
    presupuestos: contar(
      sesiones.map((s) => s.presupuesto),
      opciones("presupuesto"),
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

export async function getScanMetricas(p: Periodo) {
  const since = desde(p);
  let q = supabaseAdmin().from("wine_scans").select("created_at, accion, vino_detectado, confianza, grupo, slug_recomendado, feedback, latencia_ms").limit(MAX);
  if (since) q = q.gte("created_at", since);
  const scans = check(await q, "los escaneos");
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
      { alta: "Alta", media: "Media", baja: "Baja" },
    ).sort((a, b) => ["alta", "media", "baja"].indexOf(a.key) - ["alta", "media", "baja"].indexOf(b.key)),
    porDia: porDia(
      scans.map((s) => s.created_at),
      p,
    ),
    tecnico: { latenciaMedia: latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null, errores },
  };
}
