import { cartSchema, validateCart } from "@/lib/cart/validate";

// Valida el carrito y devuelve líneas y totales calculados con los precios de la base.
// Solo existe con la tienda abierta o en el preview (proxy.ts).

const MAX_BODY_BYTES = 16_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ ok: false, error: "Carrito demasiado grande." }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "No pudimos leer tu carrito." }, { status: 400 });
  }
  const parsed = cartSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "No pudimos leer tu carrito." }, { status: 400 });

  try {
    return Response.json(await validateCart(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("carrito: no se pudo validar", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "No pudimos revisar tu carrito. Intenta de nuevo." }, { status: 503 });
  }
}
