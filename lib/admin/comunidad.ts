import "server-only";
import { getArticles } from "@/lib/blog/content";
import { PERFILES } from "@/lib/quiz/config";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WINE_TYPE_LABELS, type WineType } from "@/lib/wine-types";
import { ESTADO_LABEL, estadoEspera, fechaCdmx, origenLabel, type EstadoEspera } from "./comunidad-format";

// Datos de Comunidad (/admin/comunidad): lista de espera, correos guardados desde el quiz y guías pedidas.
// Solo servidor y solo para admin (cada página y la exportación llaman requireAdmin antes).
// Los correos nunca van en la URL: la búsqueda filtra en el navegador sobre lo que ya se cargó.

const MAX_ROWS = 5000;

export type EsperaRow = {
  id: string;
  email: string;
  gustos: string;
  origen: string;
  fecha: string;
  creado: string;
  correos: number;
  estado: EstadoEspera;
  estadoLabel: string;
};
export type QuizRow = { id: string; email: string; perfil: string; novedades: boolean; fecha: string; creado: string; enviado: boolean };
export type GuiaRow = { id: string; email: string; guia: string; novedades: boolean; fecha: string; creado: string; enviado: boolean };

const perfilNames = () => Object.fromEntries(PERFILES.map((p) => [p.id, p.nombre]));
async function guideTitles() {
  const articles = await getArticles();
  return Object.fromEntries(articles.filter((a) => a.tipo === "guia").map((a) => [a.slug, a.titulo]));
}

function fail(what: string, error: { code?: string; message?: string }): never {
  console.error(`admin/comunidad: no se pudo leer ${what}`, error.code);
  throw new Error(`No se pudo leer ${what}.`);
}

export async function getEspera(): Promise<EsperaRow[]> {
  const db = supabaseAdmin();
  const [signups, sends, guias] = await Promise.all([
    db
      .from("waitlist_signups")
      .select("id, email, wine_types, source, created_at, confirmation_sent_at, unsubscribed_at, purchased_at")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    db.from("waitlist_email_sends").select("signup_id").limit(MAX_ROWS * 6),
    guideTitles(),
  ]);
  if (signups.error) fail("la lista de espera", signups.error);
  if (sends.error) fail("los correos enviados", sends.error);
  const perfiles = perfilNames();
  const enviados = new Map<string, number>();
  for (const s of sends.data ?? []) enviados.set(s.signup_id, (enviados.get(s.signup_id) ?? 0) + 1);
  return (signups.data ?? []).map((r) => {
    const estado = estadoEspera(r);
    return {
      id: r.id,
      email: r.email,
      gustos: ((r.wine_types ?? []) as WineType[]).map((t) => WINE_TYPE_LABELS[t] ?? t).join(", "),
      origen: origenLabel(r.source, perfiles, guias),
      fecha: fechaCdmx(r.created_at),
      creado: r.created_at,
      correos: (r.confirmation_sent_at ? 1 : 0) + (enviados.get(r.id) ?? 0),
      estado,
      estadoLabel: ESTADO_LABEL[estado],
    };
  });
}

export async function getQuizGuardados(): Promise<QuizRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("quiz_saved_profiles")
    .select("id, email, marketing_consent, created_at, sent_at, quiz_id")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) fail("los correos del quiz", error);
  const ids = [...new Set((data ?? []).map((r) => r.quiz_id))];
  const perfilDe = new Map<string, string>();
  if (ids.length) {
    const sessions = await db.from("quiz_sessions").select("id, perfil").in("id", ids);
    if (sessions.error) fail("los perfiles del quiz", sessions.error);
    for (const s of sessions.data ?? []) perfilDe.set(s.id, s.perfil);
  }
  const perfiles = perfilNames();
  return (data ?? []).map((r) => {
    const p = perfilDe.get(r.quiz_id) ?? "";
    return { id: r.id, email: r.email, perfil: perfiles[p] ?? p, novedades: r.marketing_consent, fecha: fechaCdmx(r.created_at), creado: r.created_at, enviado: !!r.sent_at };
  });
}

export async function getGuiasPedidas(): Promise<GuiaRow[]> {
  const db = supabaseAdmin();
  const [{ data, error }, guias] = await Promise.all([
    db.from("guide_requests").select("id, email, guide_slug, marketing_consent, created_at, sent_at").order("created_at", { ascending: false }).limit(MAX_ROWS),
    guideTitles(),
  ]);
  if (error) fail("las guías pedidas", error);
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    guia: guias[r.guide_slug] ?? r.guide_slug,
    novedades: r.marketing_consent,
    fecha: fechaCdmx(r.created_at),
    creado: r.created_at,
    enviado: !!r.sent_at,
  }));
}

/** Cifras de la cabecera de Comunidad. */
export async function getResumen() {
  const db = supabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [activas, nuevas, quiz, guias] = await Promise.all([
    db.from("waitlist_signups").select("id", head).is("unsubscribed_at", null),
    db.from("waitlist_signups").select("id", head).is("unsubscribed_at", null).gte("created_at", weekAgo),
    db.from("quiz_saved_profiles").select("id", head),
    db.from("guide_requests").select("id", head),
  ]);
  return { activas: activas.count ?? 0, nuevas: nuevas.count ?? 0, quiz: quiz.count ?? 0, guias: guias.count ?? 0 };
}
