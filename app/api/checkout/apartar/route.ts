import { revalidateTag } from "next/cache";
import { z } from "zod";
import { cartSchema, validateCart } from "@/lib/cart/validate";
import { checkoutSchema, fieldErrors } from "@/lib/checkout/schema";
import { ipDe, leerJson, NO_STORE } from "@/lib/checkout/request";
import { apartar, botellasApartadas, previoValido } from "@/lib/inventario/apartado";
import { isRateLimited } from "@/lib/rate-limit";

// "Continuar al pago": revisa los datos y el carrito en el servidor y aparta las botellas 30 minutos (crea el
// pedido "Pago pendiente"). Con `previo` (id y llave del apartado anterior) lo conserva, lo renueva o lo suelta.
// Solo existe con la tienda abierta o en el preview (proxy.ts). No registra datos personales en los logs.

const bodySchema = z.object({ customer: z.unknown(), kits: cartSchema.shape.kits, previo: z.unknown().optional(), codigo: z.string().max(40).nullish() });

export async function POST(request: Request) {
  if (isRateLimited(`apartar:${ipDe(request)}`)) {
    return Response.json({ ok: false, error: "Demasiados intentos. Espera unos minutos y vuelve a probar." }, { status: 429 });
  }
  const leido = await leerJson(request, 24_000);
  const parsed = leido.ok ? bodySchema.safeParse(leido.body) : null;
  if (!parsed?.success) return Response.json({ ok: false, error: "No pudimos leer tus datos." }, { status: leido.ok ? 400 : leido.status });

  const customer = checkoutSchema.safeParse(parsed.data.customer);
  try {
    const cart = await validateCart({ kits: parsed.data.kits }, await botellasApartadas(parsed.data.previo));
    if (!customer.success) return Response.json({ ok: false, fieldErrors: fieldErrors(customer.error), cart }, { headers: NO_STORE });
    if (!cart.ok || cart.kits.length === 0) return Response.json({ ok: false, cart, cartError: "Tu carrito necesita un cambio antes de pagar." }, { headers: NO_STORE });

    const r = await apartar({ customer: customer.data, kits: parsed.data.kits, previo: previoValido(parsed.data.previo) ? parsed.data.previo : null, codigo: parsed.data.codigo || null });
    if (!r.ok) return Response.json({ ok: false, cart, cartError: r.error, faltantes: r.faltantes ?? [], codigoError: r.codigo ?? null }, { headers: NO_STORE });
    // Lo apartado deja de estar disponible para los demás: la tienda se actualiza en la siguiente visita.
    revalidateTag("catalogo", "max");
    return Response.json({ ok: true, cart, apartado: r.apartado, serverNow: new Date().toISOString() }, { headers: NO_STORE });
  } catch (e) {
    console.error("checkout: no se pudo apartar", e instanceof Error ? e.message : "error");
    return Response.json({ ok: false, error: "No pudimos revisar tu pedido. Intenta de nuevo." }, { status: 503 });
  }
}
