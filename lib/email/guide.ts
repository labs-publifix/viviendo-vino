import "server-only";
import { renderBrandEmail } from "./brand-layout";

// Correo con la guía en PDF que alguien pidió desde un artículo del blog. Es un correo de servicio
// (lo pidió la persona): no lleva enlace de baja. El PDF va como enlace, no adjunto, para no caer en spam.

export function renderGuideEmail(input: { titulo: string; pdfUrl: string; articleUrl: string }) {
  const subject = `Tu guía: ${input.titulo}`;
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: "Aquí está tu guía en PDF. Guárdala en el celular o imprímela para tenerla a la mano.",
    eyebrow: "Tu guía en PDF",
    heading: input.titulo,
    paragraphs: [
      "Aquí está la guía que pediste. Es una sola hoja: guárdala en el celular o imprímela para tenerla a la mano.",
      `Si quieres la explicación completa, el artículo sigue en ${input.articleUrl.replace(/^https?:\/\//, "")}.`,
      "Evita el exceso. Venta solo a mayores de 18 años.",
    ],
    cta: { label: "Descargar la guía", url: input.pdfUrl },
    reason: "Recibes este correo porque pediste esta guía en viviendovino.com.",
  });
  return { subject, html, text };
}
