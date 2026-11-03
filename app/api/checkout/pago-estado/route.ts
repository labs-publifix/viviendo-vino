import { ipDe, leerJson, NO_STORE } from "@/lib/checkout/request";
import { previoValido } from "@/lib/inventario/apartado";
import { mpConfigurado } from "@/lib/mercadopago/client";
import { consultarApartado } from "@/lib/mercadopago/cobro";
import { isRateLimited } from "@/lib/rate-limit";

// Estado del pago de un apartado: después del reto 3-D Secure o mientras Mercado Pago lo revisa. Consulta la orden en
// Mercado Pago (no depende solo del webhook) y la aplica al pedido. Solo con la llave del apartado.

export async function POST(request: Request) {
  if (!mpConfigurado()) return Response.json({ estado: "error", mensaje: "No disponible." }, { status: 503 });
  if (isRateLimited(`pago-estado:${ipDe(request)}:${Math.floor(Date.now() / 60_000)}`)) return Response.json({ estado: "error", mensaje: "Demasiados intentos." }, { status: 429 });
  const leido = await leerJson(request, 1_000);
  if (!leido.ok || !previoValido(leido.body)) return Response.json({ estado: "error", mensaje: "No pudimos leer tu pedido." }, { status: 400 });
  try {
    return Response.json(await consultarApartado(leido.body), { headers: NO_STORE });
  } catch {
    return Response.json({ estado: "error", mensaje: "No pudimos revisar tu pago. Intenta de nuevo." }, { status: 503 });
  }
}
