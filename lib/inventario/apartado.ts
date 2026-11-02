import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { crearPedido, datosCliente, leerCambios, type CambioInventario } from "@/lib/admin/pedidos";
import type { CartInput } from "@/lib/cart/validate";
import type { CheckoutInput } from "@/lib/checkout/schema";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APARTADO_MINUTOS, huellaCarrito, leerFaltantes, MAX_RENOVACIONES, type Faltante } from "./rules";

// Apartado de botellas al iniciar el pago (checkout). El pedido nace "Pago pendiente" y sus botellas quedan
// apartadas 30 minutos. El navegador guarda solo el id del pedido y una llave al azar; la base guarda la huella
// (sha-256) de esa llave, así nadie más puede renovar, soltar ni pagar ese apartado.
// - Mismo carrito y apartado vigente: se actualizan los datos del cliente y el tiempo sigue corriendo.
// - Mismo carrito y apartado vencido: se renueva (hasta 3 veces seguidas) si las botellas siguen libres.
// - Carrito distinto: se suelta el apartado anterior y se aparta de nuevo.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{32}$/;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const nuevoToken = () => randomBytes(24).toString("base64url");

export type Previo = { id: string; token: string };
export type Apartado = {
  id: string;
  /** Solo cuando el apartado es nuevo: el navegador lo guarda para renovarlo o pagar. */
  token?: string;
  folio: string;
  /** null cuando ya no se aparta (llegó al límite de renovaciones). */
  expiraAt: string | null;
  renovaciones: number;
  maxRenovaciones: number;
  limite: boolean;
};
export type ApartarResultado = { ok: true; apartado: Apartado } | { ok: false; error: string; faltantes?: Faltante[] };

export const previoValido = (x: unknown): x is Previo =>
  !!x && typeof x === "object" && UUID.test(String((x as Previo).id)) && TOKEN.test(String((x as Previo).token));

type Fila = { id: string; folio: string; estado: string; reserva_token_hash: string | null; reserva_expira_at: string | null; reserva_renovaciones: number; total_centavos: number; prueba: boolean; cliente_email: string };

/** El pedido del apartado, solo si la llave coincide. */
export async function leerApartado(previo: Previo): Promise<Fila | null> {
  if (!previoValido(previo)) return null;
  const { data } = await supabaseAdmin()
    .from("pedidos")
    .select("id, folio, estado, reserva_token_hash, reserva_expira_at, reserva_renovaciones, total_centavos, prueba, cliente_email")
    .eq("id", previo.id)
    .maybeSingle();
  return data && data.reserva_token_hash === hashToken(previo.token) ? (data as Fila) : null;
}

async function huellaPedido(id: string): Promise<string> {
  const db = supabaseAdmin();
  const { data: kits } = await db.from("pedido_kits").select("id, posicion").eq("pedido_id", id).order("posicion");
  if (!kits?.length) return "";
  const { data: items } = await db.from("pedido_items").select("kit_id, slug, cantidad").in("kit_id", kits.map((k) => k.id));
  return huellaCarrito(kits.map((k) => ({ items: (items ?? []).filter((i) => i.kit_id === k.id).map((i) => ({ slug: i.slug as string, quantity: Number(i.cantidad) })) })));
}

const info = (p: Fila, extra: Partial<Apartado> = {}): Apartado => ({
  id: p.id,
  folio: p.folio,
  expiraAt: p.reserva_expira_at,
  renovaciones: p.reserva_renovaciones,
  maxRenovaciones: MAX_RENOVACIONES,
  limite: false,
  ...extra,
});

export async function apartar(input: { customer: CheckoutInput; kits: CartInput["kits"]; previo: Previo | null }): Promise<ApartarResultado> {
  const db = supabaseAdmin();
  const p = input.previo ? await leerApartado(input.previo) : null;
  if (p && p.estado === "pendiente_pago") {
    if ((await huellaPedido(p.id)) === huellaCarrito(input.kits)) {
      // Mismo carrito: los datos del cliente pueden haber cambiado (dirección, teléfono).
      await db.from("pedidos").update({ ...datosCliente(input.customer), updated_at: new Date().toISOString() }).eq("id", p.id);
      if (p.reserva_expira_at && Date.parse(p.reserva_expira_at) > Date.now()) return { ok: true, apartado: info(p) };
      const { data, error } = await db.rpc("renovar_apartado", { p_pedido: p.id, p_token_hash: p.reserva_token_hash, p_minutos: APARTADO_MINUTOS, p_max: MAX_RENOVACIONES });
      if (!error && Array.isArray(data) && data[0]) return { ok: true, apartado: info(p, { expiraAt: data[0].reserva_expira_at, renovaciones: Number(data[0].renovaciones) }) };
      if (error?.message === "sin_existencias") return { ok: false, error: "Ya no hay suficientes botellas de un vino de tu carrito.", faltantes: leerFaltantes(error.details) };
      if (error?.message === "limite_renovaciones") return { ok: true, apartado: info(p, { expiraAt: null, limite: true }) };
      if (error && error.message !== "apartado_invalido") {
        console.error("checkout: no se pudo renovar el apartado", error.code);
        return { ok: false, error: "No pudimos apartar tus botellas. Intenta de nuevo." };
      }
    } else {
      await db.rpc("liberar_apartado", { p_pedido: p.id, p_token_hash: p.reserva_token_hash });
    }
  }
  const token = nuevoToken();
  const r = await crearPedido({ customer: input.customer, kits: input.kits, estado: "pendiente_pago", prueba: false, origen: "tienda", reserva: { minutos: APARTADO_MINUTOS, tokenHash: hashToken(token) } });
  if (!r.ok) return r;
  return { ok: true, apartado: { id: r.id, token, folio: r.folio, expiraAt: r.expiraAt, renovaciones: 0, maxRenovaciones: MAX_RENOVACIONES, limite: false } };
}

/** Botellas por vino que este apartado tiene vigentes (vacío si no es válido o ya venció). */
export async function botellasApartadas(previo: unknown): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!previoValido(previo)) return out;
  const p = await leerApartado(previo);
  if (!p || p.estado !== "pendiente_pago" || !p.reserva_expira_at || Date.parse(p.reserva_expira_at) <= Date.now()) return out;
  const db = supabaseAdmin();
  const { data: kits } = await db.from("pedido_kits").select("id").eq("pedido_id", p.id);
  if (!kits?.length) return out;
  const { data: items } = await db.from("pedido_items").select("slug, cantidad").in("kit_id", kits.map((k) => k.id));
  for (const i of items ?? []) out.set(i.slug as string, (out.get(i.slug as string) ?? 0) + Number(i.cantidad));
  return out;
}

export type EstadoApartado = { estado: string; folio: string; expiraAt: string | null; renovaciones: number; maxRenovaciones: number };
export async function estadoApartado(previo: Previo): Promise<EstadoApartado | null> {
  const p = await leerApartado(previo);
  return p ? { estado: p.estado, folio: p.folio, expiraAt: p.reserva_expira_at, renovaciones: p.reserva_renovaciones, maxRenovaciones: MAX_RENOVACIONES } : null;
}

export type PagoResultado =
  | { ok: true; folio: string; id: string; email: string; cambios: CambioInventario[]; yaPagado: boolean }
  | { ok: false; error: string; faltantes?: Faltante[] };

/**
 * Pago aprobado de un apartado: descuenta las botellas (aunque el apartado haya vencido, si siguen libres) y pasa
 * el pedido a "Por preparar". Hoy solo lo usa el pago de prueba de dev; Mercado Pago llamará lo mismo.
 */
export async function pagarApartado(previo: Previo, pago: { proveedor: "prueba" | "mercadopago"; referencia?: string; prueba: boolean; detalle: string }): Promise<PagoResultado> {
  const p = await leerApartado(previo);
  if (!p) return { ok: false, error: "No encontramos tu pedido. Vuelve a intentarlo desde el carrito." };
  if (p.estado === "pagado") return { ok: true, folio: p.folio, id: p.id, email: p.cliente_email, cambios: [], yaPagado: true };
  if (p.estado !== "pendiente_pago") return { ok: false, error: "Este pedido ya no se puede pagar. Vuelve a intentarlo desde el carrito." };
  const { data, error } = await supabaseAdmin().rpc("confirmar_pago", {
    p_pedido: p.id,
    p_pago: { proveedor: pago.proveedor, referencia: pago.referencia ?? null, prueba: pago.prueba },
    p_evento: { detalle: pago.detalle },
  });
  if (error?.message === "sin_existencias") return { ok: false, error: "Ya no hay suficientes botellas de un vino de tu carrito.", faltantes: leerFaltantes(error.details) };
  if (error) {
    console.error("checkout: no se pudo confirmar el pago", error.code);
    return { ok: false, error: "No pudimos confirmar tu pago. Intenta de nuevo." };
  }
  return { ok: true, folio: p.folio, id: p.id, email: p.cliente_email, cambios: leerCambios(data), yaPagado: false };
}
