import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { armarPromo, normalizarCodigoPromo, type CodigoFila, type Promo } from "@/lib/promo-rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Datos de la página /promo/<CÓDIGO>. La tabla de códigos no es pública: se lee en el servidor y solo sale lo que
// el cliente ya ve en el checkout (texto público, tipo de descuento, vigencia y condiciones). En caché unos
// minutos; al guardar un código en el panel se vence la etiqueta "codigos".

const COLUMNAS = "id, codigo, texto_publico, tipo, valor, tope_centavos, inicia_at, termina_at, usos_max, usos_por_cliente, min_kits, solo_primera_compra";

export async function promoPorCodigo(raw: string): Promise<Promo | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("codigos");
  const codigo = normalizarCodigoPromo(raw);
  if (!codigo) return null;
  const db = supabaseAdmin();
  const { data, error } = await db.from("codigos_descuento").select(COLUMNAS).eq("codigo", codigo).maybeSingle();
  if (error) {
    console.error("promo: no se pudo leer el código", error.code);
    return null;
  }
  if (!data) return null;
  // Mismas reglas que el checkout (vigencia, pausa y cupo); sin correo ni kits todavía.
  const { data: motivo } = await db.rpc("_codigo_motivo", { p_codigo: data.id, p_excluir: null, p_email: null, p_kits: 10, p_vigencia: true });
  return armarPromo(data as CodigoFila, (motivo as string | null) ?? null);
}

/** Códigos activos para pre-generar sus páginas al compilar (si la base no responde, ninguno). */
export async function codigosActivos(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin().from("codigos_descuento").select("codigo").eq("activo", true);
    return (data ?? []).map((r) => r.codigo as string);
  } catch {
    return [];
  }
}
