import "server-only";
import type { CartInput } from "@/lib/cart/validate";
import { leerApartado, previoValido } from "@/lib/inventario/apartado";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aplicarDescuento, codigoValido, normalizarCodigo, textoMotivo, type MotivoCodigo } from "./rules";

// Códigos de descuento en la tienda: si hay campañas activas (para mostrar el campo) y la vista previa de un código
// con el carrito del cliente. La decisión final la toma la base al apartar (crear_pedido), con el código bloqueado.

export async function hayCodigosActivos(): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("tienda_hay_codigos");
  if (error) {
    // Base sin el SQL de descuentos: simplemente no hay campo.
    if (error.code !== "PGRST202" && error.code !== "42883") console.error("descuentos: no se pudo saber si hay códigos", error.code);
    return false;
  }
  return data === true;
}

export type Vista = { ok: true; codigo: string; textoPublico: string; descuento: number; subtotal: number; total: number; recortado: boolean } | { ok: false; error: string; motivo: MotivoCodigo };

const no = (motivo: MotivoCodigo, minKits?: number | null): Vista => ({ ok: false, error: textoMotivo(motivo, { minKits: minKits ?? null }), motivo });

/** Vista previa del descuento para este carrito (precios de la base, sin caché). No aparta nada. */
export async function vistaCodigo(input: { codigo: string; kits: CartInput["kits"]; email?: string | null; previo?: unknown }): Promise<Vista> {
  if (!codigoValido(input.codigo)) return no("no_existe");
  const db = supabaseAdmin();
  const texto = normalizarCodigo(input.codigo);
  const { data: c } = await db.from("codigos_descuento").select("id, codigo, tipo, valor, tope_centavos, min_kits, texto_publico").eq("codigo", texto).maybeSingle();
  if (!c) return no("no_existe");
  // Su propio apartado (mismo navegador) no cuenta contra los usos.
  const propio = previoValido(input.previo) ? await leerApartado(input.previo) : null;
  const email = input.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ? input.email : null;
  const { data: motivo, error } = await db.rpc("_codigo_motivo", { p_codigo: c.id, p_excluir: propio?.id ?? null, p_email: email, p_kits: input.kits.length, p_vigencia: true });
  if (error) {
    console.error("descuentos: no se pudo revisar el código", error.code);
    throw new Error("No se pudo revisar el código.");
  }
  if (motivo) return no(motivo as MotivoCodigo, c.min_kits);

  const slugs = [...new Set(input.kits.flatMap((k) => k.items.map((i) => i.slug)))];
  const { data: vinos } = await db.from("productos").select("slug, precio_centavos, precio_aliado_centavos").in("slug", slugs);
  const por = new Map((vinos ?? []).map((v) => [v.slug as string, v]));
  let subtotal = 0;
  let aliado = 0;
  for (const k of input.kits)
    for (const i of k.items) {
      const v = por.get(i.slug);
      if (!v || v.precio_aliado_centavos === null) return no("sin_margen");
      subtotal += Number(v.precio_centavos) * i.quantity;
      aliado += Number(v.precio_aliado_centavos) * i.quantity;
    }
  const d = aplicarDescuento({ tipo: c.tipo, valor: c.valor, topeCentavos: c.tope_centavos }, subtotal, aliado);
  if (d.descuento <= 0) return no("sin_margen");
  return { ok: true, codigo: c.codigo, textoPublico: c.texto_publico, descuento: d.descuento, subtotal, total: subtotal - d.descuento, recortado: d.recortado };
}
