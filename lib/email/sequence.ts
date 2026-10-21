import "server-only";
import { GIFT_END_MS, LAUNCH_AT_MS, capitalize, giftEnd, launch } from "@/lib/launch";
import { SITE_URL } from "@/lib/site";
import { renderBrandEmail, type BrandEmail } from "./brand-layout";

// Secuencia de la lista de espera (correos 2 a 6). El correo 1 es la confirmación inmediata.
// Cada correo se manda a todas las personas activas (sin baja) registradas antes de su hora de envío.
// Las horas se derivan de NEXT_PUBLIC_LAUNCH_AT: si cambia la apertura, se mueve toda la secuencia.

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export type SequenceStep = {
  id: "e2" | "e3" | "e4" | "e5" | "e6";
  /** Nombre corto para el equipo. */
  name: string;
  sendAtMs: number;
  /** "all": toda la lista activa · "not_purchased": excluye a quien ya compró (purchased_at). */
  audience: "all" | "not_purchased";
  subject: string;
  content: Omit<BrandEmail, "title" | "unsubscribeUrl">;
};

const giftWindow = `del ${launch.day}, ${launch.time}, al ${giftEnd.day}, ${giftEnd.time} (hora centro de México)`;

// Calendario acordado (tabla "Secuencia de correos"), relativo a la apertura del jueves 19 a las 9:00 am.
export const SEQUENCE: SequenceStep[] = [
  {
    id: "e2",
    name: "Falta una semana",
    sendAtMs: LAUNCH_AT_MS - 7 * DAY + 1 * HOUR, // jue 12 nov, 10:00 am
    audience: "all",
    subject: "Falta una semana",
    content: {
      preheader: `El ${launch.shortDay} abrimos la tienda en línea. Así se arma tu kit.`,
      eyebrow: "Faltan 7 días",
      heading: "Así se arma tu kit.",
      highlight: {
        label: "Abre la tienda en línea",
        value: capitalize(launch.day),
        sub: `${launch.time} · hora centro de México`,
      },
      paragraphs: [
        "En una semana abrimos viviendovino.com, nuestra tienda en línea.",
        "Así se arma tu kit: eliges 6 botellas del catálogo, las juntas en tu kit y te lo enviamos a tu domicilio. El envío ya va incluido en el precio.",
        "Si compras en las primeras 48 horas con este mismo correo, tu kit llega con un regalo sorpresa.",
      ],
      cta: { label: "Ver la cuenta regresiva", url: SITE_URL },
    },
  },
  {
    id: "e3",
    name: "Mañana abrimos",
    sendAtMs: LAUNCH_AT_MS - 15 * HOUR, // mié 18 nov, 6:00 pm
    audience: "all",
    subject: `Mañana abrimos a las ${launch.time}`,
    content: {
      preheader: `Mañana a las ${launch.time} abre la tienda en línea. Tu regalo sorpresa cierra el ${giftEnd.day}.`,
      eyebrow: "Mañana abrimos",
      heading: "Tres pasos y listo.",
      highlight: {
        label: "Abre la tienda en línea",
        value: `Mañana, ${launch.time}`,
        sub: "Hora centro de México",
        note: `El regalo sorpresa cierra el ${giftEnd.day}, ${giftEnd.time}`,
      },
      paragraphs: [
        "1. Ya te apuntaste con este correo.",
        "2. Compra tu kit en viviendovino.com en las primeras 48 horas después de la apertura, con este mismo correo.",
        "3. Recibe tu regalo sorpresa con tu pedido.",
        `La ventana del regalo va ${giftWindow}. El pago es con Mercado Pago, de contado.`,
      ],
      cta: { label: "Ver la cuenta regresiva", url: SITE_URL },
    },
  },
  {
    id: "e4",
    name: "Ya abrimos",
    sendAtMs: LAUNCH_AT_MS, // jue 19 nov, 9:00 am
    audience: "all",
    subject: "Ya abrimos. Tu regalo sorpresa te espera",
    content: {
      preheader: `La tienda en línea ya está abierta. Tienes 48 horas para tu regalo sorpresa.`,
      eyebrow: "Ya abrimos",
      heading: "Arma tu kit.",
      highlight: {
        label: "Tu regalo sorpresa",
        value: "48 horas",
        sub: `Hasta el ${giftEnd.day}, ${giftEnd.time} · hora centro de México`,
      },
      paragraphs: [
        "La tienda en línea de Viviendo Vino ya está abierta. Elige tus 6 botellas en viviendovino.com: el envío va incluido.",
        "Compra en las próximas 48 horas con este mismo correo y te enviamos un regalo sorpresa con tu pedido.",
      ],
      cta: { label: "Ir a la tienda", url: SITE_URL },
    },
  },
  {
    id: "e5",
    name: "Quedan 24 horas",
    sendAtMs: LAUNCH_AT_MS + 24 * HOUR, // vie 20 nov, 9:00 am
    audience: "not_purchased",
    subject: "Te quedan 24 horas para tu regalo sorpresa",
    content: {
      preheader: `Tu regalo sorpresa sigue disponible hasta mañana a las ${giftEnd.time}.`,
      eyebrow: "Quedan 24 horas",
      heading: "Tu regalo sigue en pie.",
      highlight: {
        label: "Cierra",
        value: `Mañana, ${giftEnd.time}`,
        sub: `${capitalize(giftEnd.day)} · hora centro de México`,
      },
      paragraphs: [
        "Arma tu kit de 6 botellas en la tienda en línea y compra con este mismo correo para recibir tu regalo sorpresa.",
      ],
      cta: { label: "Ir a la tienda", url: SITE_URL },
    },
  },
  {
    id: "e6",
    name: "Último aviso",
    sendAtMs: GIFT_END_MS - 13 * HOUR, // vie 20 nov, 8:00 pm
    audience: "not_purchased",
    subject: `El regalo cierra mañana a las ${giftEnd.time}`,
    content: {
      preheader: `Último aviso: tu regalo sorpresa cierra mañana a las ${giftEnd.time}.`,
      eyebrow: "Último aviso",
      heading: "Cierra mañana.",
      paragraphs: [
        `Tu regalo sorpresa cierra mañana, ${giftEnd.day}, a las ${giftEnd.time}. Compra con este mismo correo.`,
      ],
      cta: { label: "Ir a la tienda", url: SITE_URL },
    },
  },
];

export function renderSequenceEmail(step: SequenceStep, unsubscribeUrl: string) {
  const { html, text } = renderBrandEmail({ ...step.content, title: step.subject, unsubscribeUrl });
  return { subject: step.subject, html, text };
}
