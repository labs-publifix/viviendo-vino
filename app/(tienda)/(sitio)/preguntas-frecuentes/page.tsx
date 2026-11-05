import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { storeEnabled } from "@/lib/catalog/enabled";
import { CONTACTO } from "@/lib/contacto";
import { SITE_URL } from "@/lib/site";
import { InfoPage } from "../_info/InfoPage";
import styles from "../_info/info.module.css";

// Preguntas frecuentes autorizadas (documento del 5 de noviembre de 2026). Mismo diseño de siempre: grupos con
// preguntas plegables (details/summary). El texto es el del documento; solo se agregan enlaces.

export const metadata: Metadata = {
  title: "Preguntas frecuentes · Viviendo Vino",
  description: "Kits de 6 botellas, precios con envío incluido, pagos con Mercado Pago, facturas, tiempos de entrega, cancelaciones, devoluciones y privacidad.",
  alternates: { canonical: `${SITE_URL}/preguntas-frecuentes` },
};

const Correo = () => <a href={CONTACTO.correo.href}>{CONTACTO.correo.texto}</a>;

const GROUPS: { title: string; items: { q: string; a: ReactNode }[] }[] = [
  {
    title: "Sobre la tienda",
    items: [
      {
        q: "¿Qué es viviendovino.com?",
        a: <p>Una tienda en línea que reúne vinos de distintos importadores aliados en México. Tú armas tu kit, el importador te lo envía directamente y nosotros te atendemos durante todo el proceso.</p>,
      },
      {
        q: "¿Necesito ser mayor de edad para comprar?",
        a: <p>Sí. Solo vendemos a personas mayores de 18 años. Debes confirmarlo al entrar al sitio y al comprar, y quien reciba el paquete también debe ser mayor de edad.</p>,
      },
      {
        q: "¿Necesito crear una cuenta?",
        a: <p>No. Compras como invitado: solo captura tus datos de contacto y entrega en cada pedido.</p>,
      },
    ],
  },
  {
    title: "Kits y productos",
    items: [
      { q: "¿Puedo comprar una sola botella?", a: <p>No. Vendemos únicamente kits de 6 botellas.</p> },
      {
        q: "¿Cómo armo mi kit?",
        a: <p>Eliges 6 botellas de un mismo grupo. Los grupos se forman según la forma de la botella, para que todas encajen perfecto en la caja y tu vino viaje protegido. La tienda te guía para que solo combines botellas compatibles.</p>,
      },
      {
        q: "¿Por qué no puedo mezclar botellas de grupos distintos?",
        a: <p>Porque las botellas de formas diferentes no encajan igual en la caja y aumentaría el riesgo de que se rompan durante el envío.</p>,
      },
      {
        q: "¿Qué es el quiz de IA?",
        a: <p>Un cuestionario breve que usa inteligencia artificial para recomendarte vinos según tus gustos. Es gratuito y sus resultados son orientativos. Si quieres, puedes recibirlos por correo.</p>,
      },
      {
        q: "¿Qué hacen con mi correo si lo dejo en el quiz?",
        a: <p>Lo usamos para enviarte tus resultados. Solo te enviaremos promociones y novedades si marcas la casilla para autorizarlo, y puedes darte de baja cuando quieras. Nunca vendemos tus datos.</p>,
      },
    ],
  },
  {
    title: "Precios, pagos y facturas",
    items: [
      { q: "¿Los precios incluyen impuestos y envío?", a: <p>Sí. Todos los precios están en pesos mexicanos e incluyen impuestos y envío a todo México.</p> },
      { q: "¿Qué formas de pago aceptan?", a: <p>Todas las que ofrece Mercado Pago al momento de pagar.</p> },
      { q: "¿Es seguro pagar?", a: <p>Sí. El pago se procesa directamente en Mercado Pago. Nosotros nunca vemos ni guardamos los datos de tu tarjeta.</p> },
      {
        q: "¿Pueden facturar mi compra?",
        a: (
          <p>
            Sí. Marca la casilla “Requiero factura” al comprar y envía a <Correo /> tu número de pedido y tu Constancia de Situación Fiscal. Gestionamos la factura con el
            importador, que la emite, y te la enviamos por correo. Te recomendamos solicitarla dentro del mismo mes de tu compra.
          </p>
        ),
      },
    ],
  },
  {
    title: "Envíos",
    items: [
      { q: "¿Cuánto cuesta el envío?", a: <p>Nada adicional. Todos los kits incluyen envío nacional.</p> },
      {
        q: "¿Cuánto tarda mi pedido?",
        a: <p>Hasta 7 días hábiles a partir de la fecha de compra. Esto incluye de 1 a 2 días hábiles para preparar tu kit y el tiempo de traslado de la paquetería.</p>,
      },
      {
        q: "¿Cómo sé dónde va mi pedido?",
        a: <p>Al confirmarse tu pago recibes un correo con tu número de pedido. Cuando tu kit sale a ruta, recibes otro correo con el nombre de la paquetería y tu número de guía para rastrearlo.</p>,
      },
      {
        q: "¿Envían a todo México?",
        a: <p>Sí. Si tu dirección está en una zona de difícil acceso o fuera de la cobertura habitual, te contactamos para acordar la mejor forma de hacerte llegar tu pedido. No hacemos envíos internacionales.</p>,
      },
      {
        q: "¿Quién me entrega el pedido?",
        a: <p>El importador aliado lo envía mediante una paquetería como Tres Guerras u otra. Cualquier tema con tu entrega lo resolvemos nosotros.</p>,
      },
      {
        q: "No estaré en casa, ¿puede recibir otra persona?",
        a: <p>Sí, siempre que sea mayor de 18 años. La paquetería podría pedirle una identificación oficial.</p>,
      },
    ],
  },
  {
    title: "Cancelaciones, daños y devoluciones",
    items: [
      {
        q: "¿Puedo cancelar mi pedido?",
        a: <p>Sí, siempre que todavía no hayas recibido el correo de notificación de envío. Escríbenos con tu número de pedido y te reembolsamos el total. Una vez enviado, el pedido ya no puede cancelarse.</p>,
      },
      {
        q: "Mi caja llegó golpeada, con botellas rotas o faltantes, ¿qué hago?",
        a: (
          <p>
            Toma fotografías de la caja, la guía y el contenido, y escríbenos a <Correo /> dentro de las 48 horas siguientes a la entrega, con tu número de pedido. Nosotros
            gestionamos todo con el importador; si hay que regresar el producto, te enviamos una guía prepagada.
          </p>
        ),
      },
      {
        q: "Un vino llegó en mal estado, ¿qué hago?",
        a: <p>Escríbenos en cuanto lo detectes y conserva la botella con su corcho y el contenido restante. Revisamos cada caso y, si procede, te reponemos el vino o te reembolsamos.</p>,
      },
      {
        q: "¿Puedo devolver mi kit si cambié de opinión?",
        a: (
          <p>
            Una vez enviado, no aceptamos devoluciones por cambio de opinión. Sin embargo, la Ley Federal de Protección al Consumidor te permite revocar tu compra dentro de los 5
            días hábiles posteriores a la entrega, siempre que las botellas estén cerradas y con sellos intactos; en ese caso el envío de regreso corre por tu cuenta. Consulta
            los <Link href="/terminos">Términos y Condiciones</Link>.
          </p>
        ),
      },
      {
        q: "¿Cuándo recibo mi reembolso?",
        a: <p>Lo procesamos al mismo medio de pago en un máximo de 10 días hábiles después de autorizarlo. El tiempo en que se refleja depende de tu banco.</p>,
      },
    ],
  },
  {
    title: "Privacidad",
    items: [
      {
        q: "¿Qué hacen con mis datos?",
        a: (
          <p>
            Los usamos para procesar y entregar tu pedido, y solo los compartimos con el importador y la paquetería que te lo entregan. No los vendemos. Consulta el{" "}
            <Link href="/privacidad">Aviso de Privacidad</Link> para el detalle.
          </p>
        ),
      },
      {
        q: "¿Cómo dejo de recibir correos promocionales?",
        a: (
          <p>
            Usa el enlace “Darme de baja” en cualquier correo o escríbenos a <Correo />.
          </p>
        ),
      },
      {
        q: "¿Cómo pido que corrijan o eliminen mis datos?",
        a: (
          <p>
            Escribe a <Correo /> con el asunto “Derechos ARCO” siguiendo los pasos del <Link href="/privacidad">Aviso de Privacidad</Link>.
          </p>
        ),
      },
    ],
  },
  {
    title: "Contacto",
    items: [
      {
        q: "¿Cómo los contacto?",
        a: (
          <p>
            Correo: <Correo /> · Teléfono y WhatsApp: <a href={CONTACTO.telefono.href}>{CONTACTO.telefono.texto}</a> · Lunes a viernes, 9:00 a 18:00 (hora del centro de México)
          </p>
        ),
      },
    ],
  },
];

export default function PreguntasFrecuentes() {
  if (!storeEnabled()) notFound();
  return (
    <InfoPage label="Ayuda" title="Preguntas frecuentes." updated="5 de noviembre de 2026" draft={false}>
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
      <p className={styles.closing}>El abuso en el consumo de este producto es nocivo para la salud. Venta exclusiva a mayores de 18 años.</p>
    </InfoPage>
  );
}
