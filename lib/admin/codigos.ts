import "server-only";
import { comisionMPEstimada, esVenta } from "@/lib/admin/pedidos-rules";
import { estadoCodigo, type EstadoCodigo, type TipoCodigo } from "@/lib/descuentos/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Códigos de descuento en el panel (solo admin): los códigos con sus resultados (usos pagados y apartados, total
// descontado, ventas y margen neto que dejaron) y kits de ejemplo para ver el efecto en el margen al crearlos.

export type CodigoPanel = {
  id: string;
  codigo: string;
  descripcion: string;
  textoPublico: string;
  tipo: TipoCodigo;
  valor: number;
  topeCentavos: number | null;
  iniciaAt: string;
  terminaAt: string | null;
  usosMax: number | null;
  usosPorCliente: number | null;
  minKits: number | null;
  soloPrimeraCompra: boolean;
  activo: boolean;
  creadoPor: string;
  creado: string;
  /** Resultados: pedidos pagados (y no cancelados) y apartados vigentes con este código. */
  pagados: number;
  apartados: number;
  descontado: number;
  ventas: number;
  margenNeto: number;
  /** Pedidos con este código en cualquier estado (si hay, el tipo y el valor ya no cambian). */
  pedidos: number;
  estado: EstadoCodigo;
};

function fallo(error: { code?: string } | null, what: string) {
  if (!error) return;
  console.error(`admin/codigos: no se pudo leer ${what}`, error.code);
  throw new Error(`No se pudo leer ${what}.`);
}

export async function getCodigos(): Promise<CodigoPanel[]> {
  const db = supabaseAdmin();
  const [c, p] = await Promise.all([
    db.from("codigos_descuento").select("*").order("created_at", { ascending: false }),
    db.from("pedidos").select("codigo_id, estado, reserva_expira_at, total_centavos, descuento_centavos, comision_centavos, comision_mp_centavos").not("codigo_id", "is", null),
  ]);
  fallo(c.error, "los códigos");
  fallo(p.error, "los pedidos con código");
  const ahora = Date.now();
  return (c.data ?? []).map((x) => {
    const suyos = (p.data ?? []).filter((y) => y.codigo_id === x.id);
    const vendidos = suyos.filter((y) => esVenta(y.estado));
    return {
      id: x.id,
      codigo: x.codigo,
      descripcion: x.descripcion ?? "",
      textoPublico: x.texto_publico,
      tipo: x.tipo,
      valor: x.valor,
      topeCentavos: x.tope_centavos ?? null,
      iniciaAt: x.inicia_at,
      terminaAt: x.termina_at ?? null,
      usosMax: x.usos_max ?? null,
      usosPorCliente: x.usos_por_cliente ?? null,
      minKits: x.min_kits ?? null,
      soloPrimeraCompra: x.solo_primera_compra,
      activo: x.activo,
      creadoPor: x.creado_por_nombre ?? "",
      creado: x.created_at,
      pagados: vendidos.length,
      apartados: suyos.filter((y) => y.estado === "pendiente_pago" && y.reserva_expira_at && Date.parse(y.reserva_expira_at) > ahora).length,
      descontado: vendidos.reduce((s, y) => s + Number(y.descuento_centavos ?? 0), 0),
      ventas: vendidos.reduce((s, y) => s + Number(y.total_centavos), 0),
      pedidos: suyos.length,
      estado: estadoCodigo(
        { activo: x.activo, iniciaAt: x.inicia_at, terminaAt: x.termina_at ?? null, usosMax: x.usos_max ?? null },
        vendidos.length + suyos.filter((y) => y.estado === "pendiente_pago" && y.reserva_expira_at && Date.parse(y.reserva_expira_at) > ahora).length,
        ahora,
      ),
      margenNeto: vendidos.reduce((s, y) => s + Number(y.comision_centavos) - Number(y.comision_mp_centavos ?? comisionMPEstimada(Number(y.total_centavos))), 0),
    };
  });
}

export type KitEjemplo = { nombre: string; subtotal: number; aliado: number };

/** Los kits prearmados activos con su precio público y lo que le toca al aliado, para el ejemplo de margen. */
export async function getKitsEjemplo(): Promise<KitEjemplo[]> {
  const db = supabaseAdmin();
  const [k, i, v] = await Promise.all([
    db.from("kits_prearmados").select("id, nombre").eq("activo", true).order("orden"),
    db.from("kits_prearmados_items").select("kit_id, producto_id, cantidad"),
    db.from("productos").select("id, precio_centavos, precio_aliado_centavos").eq("activo", true),
  ]);
  const vino = new Map((v.data ?? []).map((x) => [x.id as string, x]));
  return (k.data ?? []).flatMap((kit) => {
    let subtotal = 0;
    let aliado = 0;
    for (const it of (i.data ?? []).filter((x) => x.kit_id === kit.id)) {
      const w = vino.get(it.producto_id);
      if (!w || w.precio_aliado_centavos === null) return [];
      subtotal += Number(w.precio_centavos) * Number(it.cantidad);
      aliado += Number(w.precio_aliado_centavos) * Number(it.cantidad);
    }
    return subtotal > 0 ? [{ nombre: kit.nombre as string, subtotal, aliado }] : [];
  });
}
