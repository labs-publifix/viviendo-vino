"use server";

import { refresh, updateTag } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/session";
import { MAX_ANUNCIOS, validarAnuncio, type AnuncioInput } from "@/lib/anuncios";
import { ANUNCIO_COLUMNS, toAnuncio } from "@/lib/anuncios-repo";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Marquesina: crear, editar, encender o apagar, mover y eliminar. Cada acción vuelve a revisar sesión y rol,
// queda en la auditoría y refresca la tienda al momento (updateTag("anuncios")).

export type FormState = { ok?: boolean; error?: string; errors?: Partial<Record<keyof AnuncioInput, string>>; savedAt?: number };
export type ActionResult = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVE_ERROR = "No se pudo guardar. Intenta otra vez.";

async function listAll() {
  const { data, error } = await supabaseAdmin().from("anuncios").select(ANUNCIO_COLUMNS).order("orden");
  if (error) throw new Error(error.code);
  return (data ?? []).map(toAnuncio);
}

function done() {
  updateTag("anuncios");
  refresh();
}

export async function saveAnuncio(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin(["admin"]);
  const id = String(form.get("id") ?? "");
  if (id && !UUID.test(id)) return { error: SAVE_ERROR };
  const programado = form.get("programacion") === "fechas";
  const v = validarAnuncio({
    texto: String(form.get("texto") ?? ""),
    enlace: String(form.get("enlace") ?? ""),
    inicia: programado ? String(form.get("inicia") ?? "") : "",
    termina: programado ? String(form.get("termina") ?? "") : "",
  });
  if (!v.ok) return { errors: v.errors };
  const row = { texto: v.data.texto, enlace: v.data.enlace, inicia_at: v.data.iniciaAt, termina_at: v.data.terminaAt, updated_at: new Date().toISOString() };
  const db = supabaseAdmin();

  try {
    const all = await listAll();
    if (id) {
      const antes = all.find((a) => a.id === id);
      if (!antes) return { error: "Ese mensaje ya no existe. Recarga la página." };
      const { error } = await db.from("anuncios").update(row).eq("id", id);
      if (error) throw new Error(error.code);
      await audit(user, "editar", "anuncios", id, antes, row);
    } else {
      if (all.length >= MAX_ANUNCIOS) return { error: `Caben hasta ${MAX_ANUNCIOS} mensajes. Elimina uno antes de agregar otro.` };
      const orden = all.reduce((m, a) => Math.max(m, a.orden), 0) + 1;
      const { data, error } = await db.from("anuncios").insert({ ...row, orden, activo: true }).select("id").single();
      if (error) throw new Error(error.code);
      await audit(user, "crear", "anuncios", data.id, null, { ...row, orden });
    }
  } catch (e) {
    console.error("admin/anuncios: no se guardó", (e as Error).message);
    return { error: SAVE_ERROR };
  }
  done();
  return { ok: true, savedAt: Date.now() };
}

export async function toggleAnuncio(id: string, activo: boolean): Promise<ActionResult> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id)) return { error: SAVE_ERROR };
  const { error } = await supabaseAdmin().from("anuncios").update({ activo, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: SAVE_ERROR };
  await audit(user, activo ? "encender" : "apagar", "anuncios", id, { activo: !activo }, { activo });
  done();
  return {};
}

export async function moveAnuncio(id: string, dir: "up" | "down"): Promise<ActionResult> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id) || (dir !== "up" && dir !== "down")) return { error: SAVE_ERROR };
  try {
    const all = await listAll();
    const i = all.findIndex((a) => a.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return {};
    [all[i], all[j]] = [all[j], all[i]];
    // Se renumera 1..n: el orden queda limpio aunque antes hubiera huecos o empates.
    const db = supabaseAdmin();
    const changed = all.map((a, k) => ({ a, orden: k + 1 })).filter(({ a, orden }) => a.orden !== orden);
    for (const { a, orden } of changed) {
      const { error } = await db.from("anuncios").update({ orden }).eq("id", a.id);
      if (error) throw new Error(error.code);
    }
    await audit(user, "mover", "anuncios", id, { posicion: i + 1 }, { posicion: j + 1 });
  } catch (e) {
    console.error("admin/anuncios: no se movió", (e as Error).message);
    return { error: SAVE_ERROR };
  }
  done();
  return {};
}

export async function deleteAnuncio(id: string): Promise<ActionResult> {
  const user = await requireAdmin(["admin"]);
  if (!UUID.test(id)) return { error: SAVE_ERROR };
  const db = supabaseAdmin();
  const { data: antes } = await db.from("anuncios").select(ANUNCIO_COLUMNS).eq("id", id).maybeSingle();
  const { error } = await db.from("anuncios").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar. Intenta otra vez." };
  await audit(user, "eliminar", "anuncios", id, antes, null);
  done();
  return {};
}
