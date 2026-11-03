import { mp } from "@/lib/mercadopago/client";
import { aplicarOrden } from "@/lib/mercadopago/cobro";
import { firmaValida, type OrdenMP } from "@/lib/mercadopago/rules";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Webhook de Mercado Pago (tema "Order"). Se valida la firma (x-signature con MP_WEBHOOK_SECRET); luego se consulta la
// orden en la API, que es la fuente de verdad (nunca se confía en el cuerpo del aviso), y se aplica a su pedido.
// Pasa sin contraseña del preview y con la tienda cerrada (lib/gate.ts): la firma es su protección.

const ORDEN = /^[A-Za-z0-9]{6,80}$/;
const TOLERANCIA_MS = 15 * 60_000;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.MP_WEBHOOK_SECRET ?? "";
  const dataId = url.searchParams.get("data.id");
  const ok = firmaValida({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
    secret,
    ahora: Date.now(),
    toleranciaMs: TOLERANCIA_MS,
  });
  if (!ok) {
    console.error("mercadopago: aviso con firma inválida o sin MP_WEBHOOK_SECRET");
    return new Response(null, { status: 401 });
  }
  const tipo = url.searchParams.get("type");
  if (tipo && tipo !== "order") return new Response(null, { status: 200 });
  if (!dataId || !ORDEN.test(dataId)) return new Response(null, { status: 200 });

  try {
    const r = await mp<OrdenMP>(`/v1/orders/${encodeURIComponent(dataId)}`, { method: "GET" });
    const orden = r.body;
    if (!orden?.id) {
      // Mercado Pago reintenta si no respondemos 2xx: un error temporal de su API vale la pena reintentarlo.
      return new Response(null, { status: r.status >= 500 ? 503 : 200 });
    }
    // external_reference es el id del pedido; si no, se busca por la orden del último intento.
    const ref = typeof orden.external_reference === "string" && /^[0-9a-f-]{36}$/i.test(orden.external_reference) ? orden.external_reference : null;
    const db = supabaseAdmin();
    const { data: p } = ref
      ? await db.from("pedidos").select("id").eq("id", ref).maybeSingle()
      : await db.from("pedidos").select("id").eq("mp_order_id", orden.id).maybeSingle();
    if (!p) return new Response(null, { status: 200 });
    await aplicarOrden(p.id, orden, "webhook");
    return new Response(null, { status: 200 });
  } catch (e) {
    console.error("mercadopago: no se pudo procesar el aviso", e instanceof Error ? e.message : "error");
    return new Response(null, { status: 503 });
  }
}
