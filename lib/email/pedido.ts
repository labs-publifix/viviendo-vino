import "server-only";
import { formatMXN } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import { renderBrandEmail } from "./brand-layout";

// Correos de pedido, con la plantilla de marca. Al cliente: confirmado, en camino y entregado (correos de
// servicio, sin enlace de baja). Al equipo: aviso de pedido por preparar, sin datos de contacto del cliente.
// Los pedidos de prueba llevan "[Prueba]" en el asunto.

export const CONTACTO = "hola@viviendovino.com";

export type PedidoCorreo = {
  id: string;
  folio: string;
  prueba: boolean;
  cliente: string;
  total: number;
  kits: { grupo: string; items: { cantidad: number; nombre: string }[] }[];
  envio: { calle: string; colonia: string; codigoPostal: string; ciudad: string; estado: string; recibe: string };
  paqueteria: string;
  guia: string;
  /** Texto de entrega del aliado ("Sale en 2 días hábiles desde Córdoba"), si lo tiene. */
  plazo: string;
};

const asunto = (p: PedidoCorreo, texto: string) => `${p.prueba ? "[Prueba] " : ""}${texto}`;
const primerNombre = (nombre: string) => nombre.replace(/\(prueba\)/i, "").trim().split(/\s+/)[0] || "";
const botellas = (p: PedidoCorreo) =>
  p.kits.flatMap((k, i) => k.items.map((it) => `${p.kits.length > 1 ? `Kit ${i + 1} · ` : ""}${it.cantidad} × ${it.nombre}`));
const resumenKits = (p: PedidoCorreo) => `${p.kits.length} ${p.kits.length === 1 ? "kit" : "kits"} de 6 botellas`;

const RAZON_CLIENTE = "Recibes este correo porque hiciste un pedido en viviendovino.com.";
const DUDAS = `¿Dudas sobre tu pedido? Responde a este correo o escríbenos a ${CONTACTO} con tu número de pedido.`;

export function renderPedidoConfirmado(p: PedidoCorreo) {
  const subject = asunto(p, `Recibimos tu pedido ${p.folio}`);
  const nombre = primerNombre(p.cliente);
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: `Tu pago quedó confirmado. ${resumenKits(p)}, envío incluido.`,
    eyebrow: "Pedido confirmado",
    heading: nombre ? `Gracias, ${nombre}` : "Gracias por tu pedido",
    highlight: { label: "Tu pedido", value: p.folio, sub: `Total ${formatMXN(p.total)}`, note: "Envío incluido" },
    paragraphs: [
      "Tu pago quedó confirmado y ya estamos preparando tu caja.",
      `La enviamos a ${p.envio.recibe ? `${p.envio.recibe}, ` : ""}${p.envio.calle}, ${p.envio.colonia}, CP ${p.envio.codigoPostal}, ${p.envio.ciudad}, ${p.envio.estado}.`,
      ...(p.plazo ? [p.plazo.endsWith(".") ? p.plazo : `${p.plazo}.`] : []),
      "Cuando salga te mandamos otro correo con la paquetería y el número de guía para rastrearla.",
      DUDAS,
    ],
    items: botellas(p),
    cta: { label: "Ver más vinos", url: `${SITE_URL}/vinos` },
    reason: RAZON_CLIENTE,
  });
  return { subject, html, text };
}

export function renderPedidoEnviado(p: PedidoCorreo) {
  const subject = asunto(p, `Tu pedido ${p.folio} va en camino`);
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: `Salió con ${p.paqueteria}. Guía ${p.guia}.`,
    eyebrow: "Va en camino",
    heading: "Tu caja ya salió",
    highlight: { label: p.paqueteria, value: p.guia, sub: "Número de guía" },
    paragraphs: [
      `Tu pedido ${p.folio} ya va rumbo a ${p.envio.ciudad}, ${p.envio.estado}, con ${p.paqueteria}. Con el número de guía puedes darle seguimiento con la paquetería.`,
      "Solo vendemos a mayores de 18 años: quien reciba la caja debe serlo.",
      DUDAS,
    ],
    reason: RAZON_CLIENTE,
  });
  return { subject, html, text };
}

export function renderPedidoEntregado(p: PedidoCorreo) {
  const subject = asunto(p, `Tu pedido ${p.folio} fue entregado`);
  const nombre = primerNombre(p.cliente);
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: "Tu caja llegó. Que la disfrutes.",
    eyebrow: "Entregado",
    heading: nombre ? `¡Salud, ${nombre}!` : "¡Salud!",
    paragraphs: [
      `Tu pedido ${p.folio} ya fue entregado. Esperamos que disfrutes cada botella.`,
      "Guárdalas acostadas, lejos de la luz y del calor. Los blancos y espumosos van mejor fríos; los tintos, un poco más frescos que la temperatura de la casa.",
      `Si algo llegó mal, escríbenos a ${CONTACTO} con tu número de pedido y una foto de la caja y las botellas.`,
      "Evita el exceso. Venta solo a mayores de 18 años.",
    ],
    cta: { label: "Arma tu próximo kit", url: `${SITE_URL}/arma-tu-kit` },
    reason: RAZON_CLIENTE,
  });
  return { subject, html, text };
}

/** Aviso al equipo (admin, atención y la gente del aliado): hay un pedido pagado por preparar. */
export function renderNuevoPedidoEquipo(p: PedidoCorreo, panelUrl: string) {
  const subject = asunto(p, `Nuevo pedido por preparar: ${p.folio}`);
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: `${resumenKits(p)} para ${p.envio.ciudad}, ${p.envio.estado}. ${formatMXN(p.total)}.`,
    eyebrow: "Panel · Pedidos",
    heading: "Nuevo pedido por preparar",
    highlight: { label: "Pedido", value: p.folio, sub: `${resumenKits(p)} · ${formatMXN(p.total)}`, note: `Destino: ${p.envio.ciudad}, ${p.envio.estado}` },
    paragraphs: ["Ya está pagado. Ábrelo en el panel para ver la dirección completa y marcarlo como “Preparando” cuando empiecen a armar la caja."],
    items: botellas(p),
    cta: { label: "Ver el pedido en el panel", url: panelUrl },
    reason: "Recibes este aviso porque tienes acceso al panel de administración de viviendovino.com.",
  });
  return { subject, html, text };
}
