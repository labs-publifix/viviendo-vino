import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { storeEnabled } from "@/lib/catalog/enabled";
import { InfoPage, Pendiente } from "../_info/InfoPage";
import styles from "../_info/info.module.css";

export const metadata: Metadata = {
  title: "Preguntas frecuentes · Viviendo Vino",
  description: "Cómo funcionan los kits de 6 botellas, los grupos, el envío incluido, el pago y la factura.",
};

const GROUPS: { title: string; items: { q: string; a: ReactNode }[] }[] = [
  {
    title: "El kit",
    items: [
      {
        q: "¿Por qué 6 botellas?",
        a: <p>Cada pedido es una caja de 6. Así el envío va incluido en el precio desde el primer kit.</p>,
      },
      {
        q: "¿Qué es un grupo de botella?",
        a: (
          <p>
            Cada vino pertenece a uno de cuatro grupos: La Selezione, I Grandi Rossi, Selezione d’Oro o Bollicine. Un kit lleva vinos de un solo grupo. La primera
            botella que eliges define el grupo y el armador te muestra qué más cabe.
          </p>
        ),
      },
      {
        q: "¿Puedo repetir el mismo vino?",
        a: <p>Sí. Puedes llevar las 6 iguales o mezclar como quieras dentro del grupo.</p>,
      },
      {
        q: "¿Puedo pedir más de un kit?",
        a: <p>Sí. Agrega los kits que quieras al carrito; cada uno lleva su envío incluido.</p>,
      },
      {
        q: "¿Venden botellas sueltas?",
        a: <p>Por ahora no. Solo kits de 6.</p>,
      },
    ],
  },
  {
    title: "Envío",
    items: [
      { q: "¿Cuánto cuesta el envío?", a: <p>Nada extra: va incluido en el precio de cada kit. <Link href="/envios">Más sobre envíos</Link>.</p> },
      { q: "¿A dónde envían?", a: <p><Pendiente>zonas de cobertura</Pendiente>.</p> },
      { q: "¿Cuánto tarda?", a: <p><Pendiente>plazo de entrega</Pendiente>.</p> },
    ],
  },
  {
    title: "Pago y factura",
    items: [
      { q: "¿Cómo pago?", a: <p>Con Mercado Pago, de contado. No ofrecemos meses sin intereses.</p> },
      {
        q: "¿Me pueden facturar?",
        a: <p>Sí. Marca “Necesito factura” en el checkout. La factura la emite el aliado que vende y envía el vino.</p>,
      },
      { q: "¿Puedo cancelar o devolver un pedido?", a: <p><Pendiente>política de cancelaciones y devoluciones</Pendiente>.</p> },
    ],
  },
  {
    title: "Edad y contacto",
    items: [
      {
        q: "¿Por qué piden mi fecha de nacimiento?",
        a: <p>Solo vendemos a mayores de 18 años. La pedimos en el checkout para confirmarlo.</p>,
      },
      {
        q: "¿Cómo los contacto?",
        a: (
          <p>
            Por correo a <a href="mailto:hola@viviendovino.com">hola@viviendovino.com</a> o por Instagram en{" "}
            <a href="https://www.instagram.com/viviendovino/" rel="noopener noreferrer" target="_blank">
              @viviendovino
            </a>
            . WhatsApp: <Pendiente>número</Pendiente>.
          </p>
        ),
      },
    ],
  },
];

export default function PreguntasFrecuentes() {
  if (!storeEnabled()) notFound();
  return (
    <InfoPage label="Ayuda" title="Preguntas frecuentes." updated="borrador del 22 de octubre de 2026">
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className={styles.faqGroup}>{g.title}</h2>
          <div className={styles.faq}>
            {g.items.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <div>{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </InfoPage>
  );
}
