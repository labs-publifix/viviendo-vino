import "server-only";
import { formatMXN } from "@/lib/money";
import { renderBrandEmail } from "./brand-layout";

// Correo de "Guarda tu perfil" del Quiz IA: resumen del perfil y de la caja, enlace al resultado y la guía en
// PDF del perfil. Es un correo de servicio (lo pidió la persona): no lleva enlace de baja. El PDF va como enlace.

export function renderQuizProfileEmail(input: {
  perfil: string;
  frase: string;
  regalo: boolean;
  kit: { nombre: string; cantidad: number }[];
  totalCentavos: number | null;
  resultUrl: string;
  pdfUrl: string;
}) {
  const subject = input.regalo ? `El perfil para tu regalo: ${input.perfil}` : `Tu perfil de vino: ${input.perfil}`;
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: "Tu perfil, tu caja de 6 y la guía en PDF de tu perfil.",
    eyebrow: "Quiz IA",
    heading: input.regalo ? "El perfil para tu regalo" : "Tu perfil de vino",
    highlight: { label: "Perfil", value: input.perfil, sub: input.frase },
    paragraphs: [
      input.kit.length > 0
        ? `Esta es la caja de 6 que armamos${input.totalCentavos ? ` (${formatMXN(input.totalCentavos)}, envío incluido)` : ""}. En el enlace de tu resultado puedes agregarla al carrito y cambiar las botellas que quieras:`
        : "En el enlace de tu resultado puedes ver tu perfil y armar tu caja.",
    ],
    items: input.kit.map((l) => `${l.cantidad} × ${l.nombre}`),
    cta: { label: "Descargar la guía de mi perfil", url: input.pdfUrl },
    secondary: { label: "Ver mi resultado", url: input.resultUrl },
    reason: "Recibes este correo porque guardaste tu perfil del quiz en viviendovino.com. Evita el exceso. Venta solo a mayores de 18 años.",
  });
  return { subject, html, text };
}
