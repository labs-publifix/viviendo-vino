import "server-only";
import { UMBRAL_POCAS, type Cruce } from "@/lib/inventario/rules";
import { renderBrandEmail } from "./brand-layout";

// Aviso al equipo (admin y la gente del aliado) cuando un vino baja a 3 botellas o menos, o se agota.
// Sin precios: lo recibe también el aliado.

export type AvisoInventario = { cruce: Cruce; vino: string; existencias: number; panelUrl: string };

export function renderAvisoInventario(a: AvisoInventario) {
  const agotado = a.cruce === "agotado";
  const subject = agotado ? `Se agotó: ${a.vino}` : `Pocas existencias: ${a.vino}`;
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: agotado ? "Ya no se puede agregar a ningún kit en la tienda." : `Quedan ${a.existencias} ${a.existencias === 1 ? "botella" : "botellas"}.`,
    eyebrow: "Panel · Inventario",
    heading: agotado ? "Un vino se agotó" : "Quedan pocas botellas",
    highlight: { label: "Vino", value: a.vino, sub: agotado ? "0 botellas" : `${a.existencias} ${a.existencias === 1 ? "botella" : "botellas"}` },
    paragraphs: agotado
      ? ["En la tienda ya aparece como agotado y nadie lo puede agregar a su kit.", "Cuando lleguen más botellas, súmalas en el panel con el botón + y vuelve a estar disponible al momento."]
      : [`Llegó a ${UMBRAL_POCAS} botellas o menos. Si hay más en bodega, actualiza el número en el panel para que la tienda no lo marque como agotado antes de tiempo.`],
    cta: { label: "Ver el inventario", url: a.panelUrl },
    reason: "Recibes este aviso porque tienes acceso al panel de administración de viviendovino.com.",
  });
  return { subject, html, text };
}
