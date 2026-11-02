import { ipDe, leerJson, NO_STORE } from "@/lib/checkout/request";
import { estadoApartado, previoValido } from "@/lib/inventario/apartado";
import { isRateLimited } from "@/lib/rate-limit";

// Estado de un apartado (al volver al checkout o al carrito): hasta cuándo siguen apartadas las botellas.
// Solo responde a quien tiene la llave del apartado; no devuelve datos del cliente.

export async function POST(request: Request) {
  if (isRateLimited(`apartado:${ipDe(request)}:${Math.floor(Date.now() / 60_000)}`)) {
    return Response.json({ ok: false, error: "Demasiados intentos." }, { status: 429 });
  }
  const leido = await leerJson(request, 1_000);
  if (!leido.ok || !previoValido(leido.body)) return Response.json({ ok: false }, { status: 400 });
  try {
    const e = await estadoApartado(leido.body);
    return Response.json(e ? { ok: true, ...e, serverNow: new Date().toISOString() } : { ok: false }, { headers: NO_STORE });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
