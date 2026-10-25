import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { StoredSession } from "./result";
import { NarrativeSchema, type Narrative } from "./schema";

// Lecturas y escrituras del quiz en Supabase (solo servidor, secret key). Ningún error de aquí rompe el quiz:
// sin caché se llama a la IA; sin sesión guardada, el resultado se muestra igual pero sin enlace compartible.

export async function getCachedNarrative(hash: string): Promise<Narrative | null> {
  try {
    const { data, error } = await supabaseAdmin().from("quiz_narratives").select("narrativa").eq("hash", hash).maybeSingle();
    if (error || !data) return null;
    const parsed = NarrativeSchema.safeParse(data.narrativa);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveNarrative(hash: string, perfil: string, narrativa: Narrative, modelo: string) {
  try {
    const { error } = await supabaseAdmin()
      .from("quiz_narratives")
      .upsert({ hash, perfil, narrativa, modelo }, { onConflict: "hash", ignoreDuplicates: true });
    if (error) console.error("quiz: no se guardó la narrativa en caché", error.code);
  } catch (err) {
    console.error("quiz: no se guardó la narrativa en caché", err instanceof Error ? err.message : err);
  }
}

export async function touchNarrative(hash: string) {
  try {
    const db = supabaseAdmin();
    const { data } = await db.from("quiz_narratives").select("usos").eq("hash", hash).maybeSingle();
    await db.from("quiz_narratives").update({ usos: (data?.usos ?? 0) + 1, ultimo_uso: new Date().toISOString() }).eq("hash", hash);
  } catch {
    // Solo es un contador.
  }
}

export async function insertSession(row: Record<string, unknown>): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin().from("quiz_sessions").insert(row);
    if (error) console.error("quiz: no se guardó la sesión", error.code);
    return !error;
  } catch (err) {
    console.error("quiz: no se guardó la sesión", err instanceof Error ? err.message : err);
    return false;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isQuizId = (id: string) => UUID.test(id);

/** Lo necesario para mostrar un resultado guardado (sin respuestas ni comentario). */
export async function getStoredSession(id: string): Promise<StoredSession | null> {
  if (!isQuizId(id)) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("quiz_sessions")
      .select("id, perfil, ocasion, kit, kit_alterno, prearmado, avisos, narrativa")
      .eq("id", id.toLowerCase())
      .maybeSingle();
    if (error || !data) return null;
    return data as StoredSession;
  } catch {
    return null;
  }
}
