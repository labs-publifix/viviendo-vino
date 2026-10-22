import { z } from "zod";
import { cartSchema, validateCart } from "@/lib/cart/validate";
import { checkoutSchema, fieldErrors } from "@/lib/checkout/schema";
import { isRateLimited } from "@/lib/rate-limit";

// Revisa los datos del checkout y el carrito en el servidor. En esta fase no hay pagos ni pedidos:
// no guarda nada, no envía correos y no registra datos personales en los logs.

const MAX_BODY_BYTES = 24_000;
const bodySchema = z.object({ customer: z.unknown(), kits: cartSchema.shape.kits });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`checkout:${ip}`)) {
    return Response.json({ ok: false, error: "Demasiados intentos. Espera unos minutos y vuelve a probar." }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ ok: false, error: "No pudimos leer tus datos." }, { status: 413 });
  let parsedBody;
  try {
    parsedBody = bodySchema.safeParse(JSON.parse(raw));
  } catch {
    parsedBody = null;
  }
  if (!parsedBody?.success) return Response.json({ ok: false, error: "No pudimos leer tus datos." }, { status: 400 });

  const customer = checkoutSchema.safeParse(parsedBody.data.customer);
  try {
    const cart = await validateCart({ kits: parsedBody.data.kits });
    const errors = customer.success ? {} : fieldErrors(customer.error);
    const cartOk = cart.ok && cart.kits.length > 0;
    return Response.json(
      {
        ok: customer.success && cartOk,
        fieldErrors: errors,
        cart,
        cartError: cartOk ? null : "Tu carrito necesita un cambio antes de pagar.",
        // Mercado Pago llega en la fase de pagos (PENDIENTES.md).
        paymentsEnabled: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("checkout: no se pudo revisar el carrito", e instanceof Error ? e.message : "error");
    return Response.json({ ok: false, error: "No pudimos revisar tu pedido. Intenta de nuevo." }, { status: 503 });
  }
}
