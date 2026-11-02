import { z } from "zod";
import { cartSchema } from "@/lib/cart/validate";
import { ipDe, leerJson, NO_STORE } from "@/lib/checkout/request";
import { textoMotivo } from "@/lib/descuentos/rules";
import { hayCodigosActivos, vistaCodigo } from "@/lib/descuentos/server";
import { isRateLimited } from "@/lib/rate-limit";

// Códigos de descuento en el checkout. GET: ¿hay campañas activas? (si no, el campo no se muestra). POST: vista
// previa de un código con el carrito. Con límite de intentos para que nadie adivine códigos a fuerza bruta.
// Solo existe con la tienda abierta o en el preview (proxy.ts).

const bodySchema = z.object({ codigo: z.string().max(40), kits: cartSchema.shape.kits.min(1), email: z.string().max(254).optional(), previo: z.unknown().optional() });

export async function GET() {
  return Response.json({ activos: await hayCodigosActivos() }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  if (isRateLimited(`codigo:${ipDe(request)}`)) {
    return Response.json({ ok: false, error: "Demasiados intentos. Espera unos minutos y vuelve a probar." }, { status: 429 });
  }
  const leido = await leerJson(request, 20_000);
  const parsed = leido.ok ? bodySchema.safeParse(leido.body) : null;
  if (!parsed?.success) return Response.json({ ok: false, error: textoMotivo("no_existe") }, { status: 400 });
  try {
    return Response.json(await vistaCodigo(parsed.data), { headers: NO_STORE });
  } catch {
    return Response.json({ ok: false, error: "No pudimos revisar el código. Intenta de nuevo." }, { status: 503 });
  }
}
