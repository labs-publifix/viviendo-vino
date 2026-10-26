import "server-only";
import { estado, fechaCorta, isoACdmx, visibles } from "@/lib/anuncios";
import { ANUNCIO_COLUMNS, toAnuncio } from "@/lib/anuncios-repo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Item } from "./AnunciosManager";

/** Todos los mensajes (también apagados y programados) con su estado de este momento. Solo para el panel. */
export async function getAnunciosPanel() {
  const { data, error } = await supabaseAdmin().from("anuncios").select(ANUNCIO_COLUMNS).order("orden");
  if (error) {
    console.error("admin/anuncios: no se pudo leer", error.code);
    throw new Error("No se pudieron leer los mensajes de la marquesina.");
  }
  const list = (data ?? []).map(toAnuncio);
  const now = Date.now();
  const items: Item[] = list.map((a) => {
    const e = estado(a, now);
    const detalle =
      e === "programado"
        ? `Empieza el ${fechaCorta(a.iniciaAt!)}${a.terminaAt ? ` y termina el ${fechaCorta(a.terminaAt)}` : ""}`
        : e === "terminado"
          ? `Terminó el ${fechaCorta(a.terminaAt!)}`
          : e === "visible" && a.terminaAt
            ? `Hasta el ${fechaCorta(a.terminaAt)}`
            : null;
    return { ...a, estado: e, detalle, inicioLocal: isoACdmx(a.iniciaAt), finLocal: isoACdmx(a.terminaAt) };
  });
  return { items, preview: visibles(list, now) };
}
