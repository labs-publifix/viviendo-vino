import "server-only";
import { capitalize, giftEnd, launch } from "@/lib/launch";
import { SITE_URL } from "@/lib/site";
import { wineTypesNote, type WineType } from "@/lib/wine-types";
import { renderBrandEmail } from "./brand-layout";

// Correo 1: confirmación de registro en la lista de espera.

export const CONFIRMATION_SUBJECT = "Ya estás en la lista de Viviendo Vino";

export function wineTypesSentence(types: readonly WineType[]): string | null {
  const note = wineTypesNote(types);
  return note ? `${note} Lo tendremos presente para el primer kit.` : null;
}

export function renderConfirmationEmail(input: { wineTypes: readonly WineType[]; unsubscribeUrl: string }) {
  const sentence = wineTypesSentence(input.wineTypes);
  const { html, text } = renderBrandEmail({
    title: CONFIRMATION_SUBJECT,
    preheader: `Abrimos la tienda en línea el ${launch.shortDay}. Compra en las primeras 48 horas y recibe un regalo sorpresa.`,
    eyebrow: "Ya estás en la lista",
    heading: "Ya estás dentro.",
    highlight: {
      label: "Abre la tienda en línea",
      value: capitalize(launch.day),
      sub: `${launch.time} · hora centro de México`,
      note: `Regalo sorpresa para compras hasta el ${giftEnd.day}, ${giftEnd.time}`,
    },
    paragraphs: [
      "Viviendo Vino es una tienda en línea: armas tu kit en viviendovino.com y te lo enviamos a tu domicilio.",
      "Compra tu primer kit de 6 botellas en las primeras 48 horas y te enviamos un regalo sorpresa con tu pedido. Para que lo reconozcamos, compra con este mismo correo.",
      "Mientras tanto, ve pensando tu primer kit: son 6 botellas y tú las armas.",
      ...(sentence ? [sentence] : []),
    ],
    cta: { label: "Ver la cuenta regresiva", url: SITE_URL },
    unsubscribeUrl: input.unsubscribeUrl,
  });
  return { subject: CONFIRMATION_SUBJECT, html, text };
}
