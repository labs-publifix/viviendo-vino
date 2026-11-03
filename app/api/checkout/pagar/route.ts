import { z } from "zod";
import { ipDe, leerJson, NO_STORE } from "@/lib/checkout/request";
import { previoValido } from "@/lib/inventario/apartado";
import { mpConfigurado } from "@/lib/mercadopago/client";
import { cobrar } from "@/lib/mercadopago/cobro";
import { leerTarjeta } from "@/lib/mercadopago/rules";
import { isRateLimited } from "@/lib/rate-limit";

// Pago con tarjeta (Card Payment Brick → API de Orders). El navegador manda la llave de su apartado y el token de la
// tarjeta; el monto lo toma el servidor del pedido. Solo existe con la tienda abierta o en el preview (proxy.ts).

const bodySchema = z.object({ id: z.string(), token: z.string(), tarjeta: z.unknown() });

export async function POST(request: Request) {
  if (!mpConfigurado()) return Response.json({ estado: "error", mensaje: "El pago con tarjeta todavía no está disponible." }, { status: 503 });
  if (isRateLimited(`pagar:${ipDe(request)}`)) {
    return Response.json({ estado: "error", mensaje: "Demasiados intentos. Espera unos minutos y vuelve a probar." }, { status: 429 });
  }
  const leido = await leerJson(request, 6_000);
  const parsed = leido.ok ? bodySchema.safeParse(leido.body) : null;
  const previo = parsed?.success ? { id: parsed.data.id, token: parsed.data.token } : null;
  const tarjeta = parsed?.success ? leerTarjeta(parsed.data.tarjeta) : null;
  if (!previo || !previoValido(previo) || !tarjeta) return Response.json({ estado: "error", mensaje: "No pudimos leer los datos del pago." }, { status: 400 });
  try {
    return Response.json(await cobrar(previo, tarjeta), { headers: NO_STORE });
  } catch (e) {
    console.error("checkout: falló el pago", e instanceof Error ? e.message : "error");
    return Response.json({ estado: "error", mensaje: "No pudimos procesar el pago. No se hizo ningún cargo; intenta de nuevo." }, { status: 503 });
  }
}
