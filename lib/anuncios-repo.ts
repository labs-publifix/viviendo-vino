import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { ANUNCIOS_RESPALDO, segundosAlSiguienteCambio, visibles, type Anuncio, type AnuncioPublico } from "./anuncios";

// Marquesina de la tienda desde Supabase (llave publicable; RLS solo deja ver los encendidos). Se cachea hasta
// el próximo inicio o fin programado (máximo 1 h) y el panel la refresca al guardar (updateTag("anuncios")).
// Si la base no responde, la tienda usa los mensajes de siempre.

export const ANUNCIO_COLUMNS = "id, texto, enlace, orden, activo, inicia_at, termina_at";

export function toAnuncio(r: Record<string, unknown>): Anuncio {
  return {
    id: r.id as string,
    texto: r.texto as string,
    enlace: (r.enlace as string | null) ?? null,
    orden: r.orden as number,
    activo: r.activo as boolean,
    iniciaAt: (r.inicia_at as string | null) ?? null,
    terminaAt: (r.termina_at as string | null) ?? null,
  };
}

export async function getAnunciosTienda(): Promise<AnuncioPublico[]> {
  "use cache";
  cacheTag("anuncios");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    cacheLife("minutes");
    return ANUNCIOS_RESPALDO;
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("anuncios").select(ANUNCIO_COLUMNS).order("orden");
  if (error || !data) {
    console.error("anuncios: no se pudo leer la marquesina; se usan los de respaldo", error?.code);
    cacheLife("minutes");
    return ANUNCIOS_RESPALDO;
  }
  const list = data.map(toAnuncio);
  const now = Date.now();
  const next = segundosAlSiguienteCambio(list, now);
  const revalidate = Math.max(60, Math.min(next ?? 3600, 3600));
  cacheLife({ stale: 60, revalidate, expire: revalidate + 3600 });
  return visibles(list, now);
}
