import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { siteOrigin } from "@/lib/admin/invite";
import { enviarCorreosPedido } from "@/lib/admin/pedido-correos";
import { CORREOS_PRUEBA } from "@/lib/admin/pedidos-prueba";
import { ipDe, leerJson, NO_STORE } from "@/lib/checkout/request";
import { pagarApartado, previoValido } from "@/lib/inventario/apartado";
import { avisarUmbrales } from "@/lib/inventario/avisos";
import { isRateLimited } from "@/lib/rate-limit";

// Pago de prueba del checkout: solo fuera de producción (dev y local), mientras se conecta Mercado Pago. Hace lo
// mismo que hará el pago aprobado: descuenta las botellas, pasa el pedido a "Por preparar" (marcado como prueba) y
// manda los correos. Al cliente solo le escribe si usó un correo del equipo; los avisos al equipo sí salen.

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") return Response.json({ ok: false, error: "No disponible." }, { status: 404 });
  if (isRateLimited(`pagar-prueba:${ipDe(request)}`)) return Response.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  const leido = await leerJson(request, 1_000);
  if (!leido.ok || !previoValido(leido.body)) return Response.json({ ok: false, error: "No pudimos leer tu pedido." }, { status: 400 });
  try {
    const r = await pagarApartado(leido.body, { proveedor: "prueba", prueba: true, detalle: "Pago de prueba desde el checkout (dev)" });
    if (!r.ok) return Response.json(r, { headers: NO_STORE });
    if (!r.yaPagado) {
      revalidateTag("catalogo", "max");
      const origen = await siteOrigin();
      const cliente = CORREOS_PRUEBA.includes(r.email.toLowerCase());
      after(async () => {
        await enviarCorreosPedido(r.id, "pagado", origen, { cliente });
        await avisarUmbrales(r.cambios, origen);
      });
    }
    return Response.json({ ok: true, folio: r.folio }, { headers: NO_STORE });
  } catch (e) {
    console.error("checkout: no se pudo hacer el pago de prueba", e instanceof Error ? e.message : "error");
    return Response.json({ ok: false, error: "No pudimos confirmar tu pago. Intenta de nuevo." }, { status: 503 });
  }
}
