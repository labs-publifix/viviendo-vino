import "server-only";
import { checkoutSchema, type CheckoutInput } from "@/lib/checkout/schema";
import { type CartInput } from "@/lib/cart/validate";
import { validateKit, type KitWine } from "@/lib/kit/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nombreGrupo } from "./catalogo";
import { esVenta, puedeVerPedido, reparto, resumenFinanzas, veCorreoCliente, veDinero, type EstadoPedido } from "./pedidos-rules";
import type { AdminUser } from "./session";

// Pedidos y Finanzas. Crear un pedido: el servidor vuelve a validar al cliente y cada kit y toma precios,
// nombres y comisión de la base en ese momento (sin caché); lo que mande el navegador solo aporta slugs y
// cantidades. Leer: el aliado solo recibe lo suyo, y el dinero y el correo del cliente solo a quien le toca.

const MAX_LISTA = 2000;

function fallo(error: { code?: string } | null, what: string) {
  if (!error) return;
  console.error(`admin/pedidos: no se pudo leer ${what}`, error.code);
  throw new Error(`No se pudo leer ${what}.`);
}
function check<T>(r: { data: T[] | null; error: { code?: string } | null }, what: string): T[] {
  fallo(r.error, what);
  return r.data ?? [];
}


// ---------- Crear ----------

export type CrearPedido = {
  customer: CheckoutInput;
  kits: CartInput["kits"];
  estado: Extract<EstadoPedido, "pendiente_pago" | "pagado">;
  prueba: boolean;
  origen?: string | null;
  por?: Pick<AdminUser, "id" | "nombre"> | null;
};
export type CrearResultado = { ok: true; id: string; folio: string } | { ok: false; error: string };

export async function crearPedido(input: CrearPedido): Promise<CrearResultado> {
  const cliente = checkoutSchema.safeParse(input.customer);
  if (!cliente.success) return { ok: false, error: "Los datos del cliente no son válidos." };
  if (input.kits.length === 0) return { ok: false, error: "El pedido no tiene kits." };
  const c = cliente.data;
  const db = supabaseAdmin();

  // Precios del momento, directo de la base.
  const slugs = [...new Set(input.kits.flatMap((k) => k.items.map((i) => i.slug)))];
  const productos = check(
    await db.from("productos").select("id, slug, nombre_oficial, precio_centavos, disponible, activo, aliado_id, grupo_id").in("slug", slugs),
    "los vinos",
  );
  const grupos = check(await db.from("grupos_botella").select("id, codigo, nombre").in("id", [...new Set(productos.map((p) => p.grupo_id))]), "los grupos");
  const grupoNombre = new Map(grupos.map((g) => [g.id as string, nombreGrupo(g.codigo, g.nombre)]));
  const porSlug = new Map(productos.map((p) => [p.slug as string, p]));
  const wines = new Map<string, KitWine>(
    productos.map((p) => [p.slug, { slug: p.slug, name: p.nombre_oficial, group: p.grupo_id, priceCents: p.precio_centavos, available: p.disponible && p.activo }]),
  );

  const kits = [];
  for (const k of input.kits) {
    const v = validateKit(k.items, wines);
    if (!v.ok) return { ok: false, error: v.message };
    kits.push({
      grupo: grupoNombre.get(v.group) ?? "Kit",
      total_centavos: v.totalCents,
      items: v.lines.map((l) => ({ producto_id: porSlug.get(l.slug)!.id, slug: l.slug, nombre: l.name, precio_centavos: l.priceCents, cantidad: l.quantity })),
    });
  }
  // Por ahora cada pedido es de un solo aliado (cada aliado prepara y envía lo suyo).
  const aliados = new Set(slugs.map((s) => porSlug.get(s)!.aliado_id as string));
  if (aliados.size !== 1) return { ok: false, error: "Por ahora un pedido solo puede llevar vinos de un aliado." };
  const aliadoId = [...aliados][0];
  const { data: aliado, error: aliadoError } = await db.from("aliados").select("comision_bps, activo").eq("id", aliadoId).maybeSingle();
  fallo(aliadoError, "el aliado");
  if (!aliado?.activo) return { ok: false, error: "Ese aliado está en pausa." };

  const subtotal = kits.reduce((s, k) => s + k.total_centavos, 0);
  const envio = 0; // Envío incluido en el precio (Fundamentos).
  const total = subtotal + envio;
  const { comision, aliado: paraAliado } = reparto(total, aliado.comision_bps);

  const pedido = {
    aliado_id: aliadoId,
    estado: input.estado,
    prueba: input.prueba,
    cliente_nombre: c.name,
    cliente_email: c.email,
    cliente_telefono: c.phone,
    calle: c.street,
    colonia: c.neighborhood,
    codigo_postal: c.postalCode,
    ciudad: c.city,
    estado_mx: c.state,
    referencias: c.references,
    recibe: c.receiver,
    factura: c.invoice,
    promos: c.promos,
    origen: input.origen ?? null,
    subtotal_centavos: subtotal,
    envio_centavos: envio,
    total_centavos: total,
    comision_bps: aliado.comision_bps,
    comision_centavos: comision,
    aliado_centavos: paraAliado,
  };
  const evento = { detalle: input.prueba ? "Pedido de prueba creado desde el panel" : "Pedido creado en la tienda", usuario_id: input.por?.id ?? "", usuario_nombre: input.por?.nombre ?? null };
  const { data, error } = await db.rpc("crear_pedido", { p_pedido: pedido, p_kits: kits, p_evento: evento });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    console.error("admin/pedidos: no se pudo crear el pedido", error?.code);
    return { ok: false, error: "No se pudo crear el pedido. Intenta otra vez." };
  }
  return { ok: true, id: row.pedido_id, folio: row.pedido_folio };
}

// ---------- Leer ----------

export type PedidoFila = {
  id: string;
  folio: string;
  creado: string;
  estado: EstadoPedido;
  prueba: boolean;
  aliadoId: string;
  aliado: string;
  cliente: string;
  email: string;
  ciudad: string;
  kits: number;
  total: number;
  comision: number | null;
  paraAliado: number | null;
};

export async function getPedidos(user: AdminUser): Promise<PedidoFila[]> {
  if (user.rol === "aliado" && !user.aliadoId) return [];
  const db = supabaseAdmin();
  let q = db
    .from("pedidos")
    .select("id, folio, created_at, estado, prueba, aliado_id, cliente_nombre, cliente_email, ciudad, estado_mx, kits, total_centavos, comision_centavos, aliado_centavos")
    .order("created_at", { ascending: false })
    .limit(MAX_LISTA);
  if (user.rol === "aliado") q = q.eq("aliado_id", user.aliadoId!);
  const [rows, aliados] = await Promise.all([q, db.from("aliados").select("id, nombre")]);
  const nombres = new Map(check(aliados, "los aliados").map((a) => [a.id as string, a.nombre as string]));
  const dinero = veDinero(user.rol);
  const correo = veCorreoCliente(user.rol);
  return check(rows, "los pedidos").map((p) => ({
    id: p.id,
    folio: p.folio,
    creado: p.created_at,
    estado: p.estado,
    prueba: p.prueba,
    aliadoId: p.aliado_id,
    aliado: nombres.get(p.aliado_id) ?? "",
    cliente: p.cliente_nombre,
    email: correo ? p.cliente_email : "",
    ciudad: [p.ciudad, p.estado_mx].filter(Boolean).join(", "),
    kits: p.kits,
    total: p.total_centavos,
    comision: dinero ? p.comision_centavos : null,
    paraAliado: dinero ? p.aliado_centavos : null,
  }));
}

export type PedidoDetalle = Awaited<ReturnType<typeof getPedido>>;

/** Un pedido con sus kits, historial y pagos. null si no existe o no le toca a esta persona. */
export async function getPedido(user: AdminUser, id: string) {
  const db = supabaseAdmin();
  const { data: p, error } = await db.from("pedidos").select("*").eq("id", id).maybeSingle();
  fallo(error, "el pedido");
  if (!p || !puedeVerPedido(user, { aliadoId: p.aliado_id })) return null;
  const [kitsR, eventosR, pagosR, aliadoR] = await Promise.all([
    db.from("pedido_kits").select("id, posicion, grupo, total_centavos").eq("pedido_id", id).order("posicion"),
    db.from("pedido_eventos").select("id, created_at, tipo, estado, detalle, usuario_nombre").eq("pedido_id", id).order("created_at"),
    db.from("pagos").select("id, created_at, proveedor, referencia, estado, monto_centavos").eq("pedido_id", id).order("created_at"),
    db.from("aliados").select("nombre").eq("id", p.aliado_id).maybeSingle(),
  ]);
  const kits = check(kitsR, "los kits del pedido");
  const items = kits.length ? check(await db.from("pedido_items").select("kit_id, slug, nombre, precio_centavos, cantidad").in("kit_id", kits.map((k) => k.id)), "las botellas del pedido") : [];
  const dinero = veDinero(user.rol);
  return {
    id: p.id as string,
    folio: p.folio as string,
    creado: p.created_at as string,
    estado: p.estado as EstadoPedido,
    prueba: p.prueba as boolean,
    aliadoId: p.aliado_id as string,
    aliado: (aliadoR.data?.nombre as string | undefined) ?? "",
    cliente: {
      nombre: p.cliente_nombre as string,
      email: veCorreoCliente(user.rol) ? (p.cliente_email as string) : null,
      telefono: p.cliente_telefono as string,
      factura: p.factura as boolean,
      promos: p.promos as boolean,
    },
    envio: {
      calle: p.calle as string,
      colonia: p.colonia as string,
      codigoPostal: p.codigo_postal as string,
      ciudad: p.ciudad as string,
      estado: p.estado_mx as string,
      referencias: (p.referencias as string | null) ?? "",
      recibe: (p.recibe as string | null) ?? "",
      paqueteria: (p.paqueteria as string | null) ?? "",
      guia: (p.guia as string | null) ?? "",
    },
    fechas: { pagado: p.pagado_at as string | null, enviado: p.enviado_at as string | null, entregado: p.entregado_at as string | null, cancelado: p.cancelado_at as string | null },
    motivoCancelacion: (p.motivo_cancelacion as string | null) ?? "",
    kits: kits.map((k) => ({
      id: k.id as string,
      grupo: k.grupo as string,
      total: k.total_centavos as number,
      items: items.filter((i) => i.kit_id === k.id).map((i) => ({ slug: i.slug as string, nombre: i.nombre as string, precio: i.precio_centavos as number, cantidad: i.cantidad as number })),
    })),
    importes: {
      subtotal: p.subtotal_centavos as number,
      envio: p.envio_centavos as number,
      total: p.total_centavos as number,
      comisionBps: dinero ? (p.comision_bps as number) : null,
      comision: dinero ? (p.comision_centavos as number) : null,
      paraAliado: dinero ? (p.aliado_centavos as number) : null,
    },
    eventos: check(eventosR, "el historial").map((e) => ({ id: String(e.id), at: e.created_at as string, tipo: e.tipo as string, estado: (e.estado as string | null) ?? null, detalle: (e.detalle as string | null) ?? "", quien: (e.usuario_nombre as string | null) ?? "" })),
    pagos: check(pagosR, "los pagos").map((x) => ({ id: x.id as string, at: x.created_at as string, proveedor: x.proveedor as string, referencia: (x.referencia as string | null) ?? "", estado: x.estado as string, monto: x.monto_centavos as number })),
  };
}

// ---------- Finanzas ----------

export type TransferenciaFila = { id: string; fecha: string; monto: number; referencia: string; nota: string; prueba: boolean };

/** Finanzas de un aliado. El rol Aliado siempre recibe las suyas, aunque pida otro. */
export async function getFinanzas(user: AdminUser, aliadoPedido: string | null) {
  const db = supabaseAdmin();
  const aliados = check(await db.from("aliados").select("id, nombre, comision_bps, activo").order("nombre"), "los aliados");
  const visibles = user.rol === "aliado" ? aliados.filter((a) => a.id === user.aliadoId) : aliados;
  const aliado = visibles.find((a) => a.id === aliadoPedido) ?? visibles[0] ?? null;
  if (!aliado) return { aliados: [], aliado: null, resumen: resumenFinanzas([], []), ventas: [], transferencias: [] };

  const [pedidosR, transR] = await Promise.all([
    db
      .from("pedidos")
      .select("id, folio, created_at, estado, prueba, total_centavos, comision_centavos, aliado_centavos, entregado_at")
      .eq("aliado_id", aliado.id)
      .order("created_at", { ascending: false })
      .limit(MAX_LISTA),
    db.from("transferencias").select("id, fecha, monto_centavos, referencia, nota, prueba").eq("aliado_id", aliado.id).order("fecha", { ascending: false }),
  ]);
  const ventas = check(pedidosR, "las ventas")
    .filter((p) => esVenta(p.estado))
    .map((p) => ({
      id: p.id as string,
      folio: p.folio as string,
      creado: p.created_at as string,
      entregado: (p.entregado_at as string | null) ?? null,
      estado: p.estado as EstadoPedido,
      prueba: p.prueba as boolean,
      total: p.total_centavos as number,
      comision: p.comision_centavos as number,
      aliado: p.aliado_centavos as number,
    }));
  const transferencias: TransferenciaFila[] = check(transR, "las transferencias").map((t) => ({
    id: t.id,
    fecha: String(t.fecha).slice(0, 10), // AAAA-MM-DD
    monto: t.monto_centavos,
    referencia: t.referencia ?? "",
    nota: t.nota ?? "",
    prueba: t.prueba,
  }));
  return {
    aliados: visibles.map((a) => ({ id: a.id as string, nombre: a.nombre as string })),
    aliado: { id: aliado.id as string, nombre: aliado.nombre as string, comisionBps: aliado.comision_bps as number },
    resumen: resumenFinanzas(ventas, transferencias.map((t) => ({ monto: t.monto }))),
    ventas,
    transferencias,
  };
}
