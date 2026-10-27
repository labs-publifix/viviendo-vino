import "server-only";
import { Resend } from "resend";
import { CONTACTO, renderNuevoPedidoEquipo, renderPedidoConfirmado, renderPedidoEntregado, renderPedidoEnviado, type PedidoCorreo } from "@/lib/email/pedido";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Envía los correos de un pedido. Se llama con after(): el panel responde de inmediato y el correo sale después.
// Si algo falla se registra (sin correos ni datos personales en el log) y no deshace el cambio del pedido.

export type CorreoPedido = "pagado" | "enviado" | "entregado";

async function leer(id: string): Promise<(PedidoCorreo & { aliadoId: string; email: string }) | null> {
  const db = supabaseAdmin();
  const { data: p } = await db
    .from("pedidos")
    .select("id, folio, prueba, aliado_id, cliente_nombre, cliente_email, total_centavos, calle, colonia, codigo_postal, ciudad, estado_mx, recibe, paqueteria, guia")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  const [kitsR, plazoR] = await Promise.all([
    db.from("pedido_kits").select("id, grupo, posicion").eq("pedido_id", id).order("posicion"),
    db.from("configuracion_comercial").select("plazo_entrega_texto").eq("aliado_id", p.aliado_id).maybeSingle(),
  ]);
  const kits = kitsR.data ?? [];
  const items = kits.length ? ((await db.from("pedido_items").select("kit_id, nombre, cantidad").in("kit_id", kits.map((k) => k.id))).data ?? []) : [];
  return {
    id: p.id,
    folio: p.folio,
    prueba: p.prueba,
    aliadoId: p.aliado_id,
    email: p.cliente_email,
    cliente: p.cliente_nombre,
    total: p.total_centavos,
    kits: kits.map((k) => ({ grupo: k.grupo, items: items.filter((i) => i.kit_id === k.id).map((i) => ({ cantidad: i.cantidad, nombre: i.nombre })) })),
    envio: { calle: p.calle, colonia: p.colonia, codigoPostal: p.codigo_postal, ciudad: p.ciudad, estado: p.estado_mx, recibe: p.recibe ?? "" },
    paqueteria: p.paqueteria ?? "",
    guia: p.guia ?? "",
    plazo: (plazoR.data?.plazo_entrega_texto as string | null) ?? "",
  };
}

/** Correos del equipo que deben enterarse de un pedido nuevo: admin, atención y la gente activa de ese aliado. */
async function equipo(aliadoId: string): Promise<string[]> {
  const { data } = await supabaseAdmin().from("admin_usuarios").select("email, rol, aliado_id").eq("activo", true);
  return [...new Set((data ?? []).filter((u) => u.rol === "admin" || u.rol === "atencion" || (u.rol === "aliado" && u.aliado_id === aliadoId)).map((u) => u.email as string))];
}

/**
 * Manda los correos que tocan según el paso: pagado (cliente + equipo), enviado y entregado (cliente).
 * `origen` es el sitio del panel para el enlace del aviso al equipo (www o dev).
 */
export async function enviarCorreosPedido(id: string, paso: CorreoPedido, origen: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("pedidos: faltan RESEND_API_KEY o EMAIL_FROM; no se mandaron correos", paso);
    return;
  }
  const p = await leer(id);
  if (!p) return;
  const resend = new Resend(apiKey);
  const mandar = async (to: string, correo: { subject: string; html: string; text: string }, quien: string) => {
    const { error } = await resend.emails.send({ from, to, replyTo: CONTACTO, ...correo });
    if (error) console.error(`pedidos: no se mandó el correo (${paso}, ${quien}) de ${p.folio}`, error.name);
  };

  if (paso === "pagado") {
    await mandar(p.email, renderPedidoConfirmado(p), "cliente");
    const panel = `${origen}/admin/pedidos/${p.id}`;
    const aviso = renderNuevoPedidoEquipo(p, panel);
    for (const to of await equipo(p.aliadoId)) await mandar(to, aviso, "equipo");
  }
  if (paso === "enviado") await mandar(p.email, renderPedidoEnviado(p), "cliente");
  if (paso === "entregado") await mandar(p.email, renderPedidoEntregado(p), "cliente");
}
