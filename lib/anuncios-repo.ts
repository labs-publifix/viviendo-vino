import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { KIT_SIZE } from "./kit/rules";
import { ANUNCIOS_RESPALDO, conPrecios, segundosAlSiguienteCambio, visibles, type Anuncio, type AnuncioPublico } from "./anuncios";

// Marquesina de la tienda desde Supabase (llave publicable; RLS solo deja ver los encendidos). Se cachea hasta
// el próximo inicio o fin programado (máximo 1 h) y el panel la refresca al guardar (updateTag("anuncios")).
// Si la base no responde, la tienda usa los mensajes de siempre. La marca {desde} se cambia por el precio del kit
// más barato: se consulta aquí mismo (una consulta mínima, sin llamar a la caché del catálogo: anidarla rompía la
// regeneración de las páginas) y esta caché también lleva el tag "catalogo", así un cambio de precio la renueva.

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
  cacheTag("anuncios", "catalogo");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    cacheLife("minutes");
    return conPrecios(ANUNCIOS_RESPALDO, null);
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("anuncios").select(ANUNCIO_COLUMNS).order("orden");
  if (error || !data) {
    console.error("anuncios: no se pudo leer la marquesina; se usan los de respaldo", error?.code);
    cacheLife("minutes");
    return conPrecios(ANUNCIOS_RESPALDO, null);
  }
  const list = data.map(toAnuncio);
  const now = Date.now();
  const next = segundosAlSiguienteCambio(list, now);
  const revalidate = Math.max(60, Math.min(next ?? 3600, 3600));
  cacheLife({ stale: 60, revalidate, expire: revalidate + 3600 });
  const lista = visibles(list, now);
  return conPrecios(lista, lista.some((a) => a.texto.includes("{desde}")) ? await kitDesde(db) : null);
}

/** Precio del kit de 6 más barato: la botella activa más barata × 6 (la llave publicable solo ve las activas). */
async function kitDesde(db: SupabaseClient): Promise<number | null> {
  const { data, error } = await db.from("productos").select("precio_centavos").order("precio_centavos").limit(1);
  const precio = !error && data?.[0] ? Number((data[0] as { precio_centavos: number }).precio_centavos) : 0;
  return precio > 0 ? precio * KIT_SIZE : null;
}
