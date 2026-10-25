import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { InfoPage, Pendiente, Section } from "../_info/InfoPage";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Viviendo Vino",
  robots: { index: false, follow: true },
};

export default function Privacidad() {
  if (!storeEnabled()) notFound();
  return (
    <InfoPage
      label="Legal"
      title="Aviso de privacidad."
      lede="Qué datos pedimos, para qué y cómo puedes pedir que los corrijamos o borremos."
      updated="borrador del 22 de octubre de 2026"
    >
      <Section n={1} title="Responsable">
        <p>
          <Pendiente>razón social, domicilio y datos del responsable</Pendiente>. Contacto para privacidad:{" "}
          <a href="mailto:hola@viviendovino.com">hola@viviendovino.com</a>.
        </p>
      </Section>
      <Section n={2} title="Datos que pedimos">
        <ul>
          <li>Contacto: nombre, correo y teléfono.</li>
          <li>Entrega: domicilio, referencias y quién recibe.</li>
          <li>Fecha de nacimiento, para confirmar que eres mayor de 18 años.</li>
          <li>Datos fiscales, solo si pides factura.</li>
        </ul>
        <p>
          No pedimos datos sensibles. Los datos de tu tarjeta los procesa Mercado Pago; nosotros no los recibimos ni los
          guardamos.
        </p>
      </Section>
      <Section n={3} title="Para qué los usamos">
        <p>Para cobrar y entregar tu pedido, confirmar tu edad, emitir tu factura si la pides y atenderte.</p>
        <p>
          Solo si lo aceptas con su casilla (que viene sin marcar), para enviarte correos con nuevas etiquetas y
          promociones. Puedes darte de baja desde el enlace de cada correo.
        </p>
      </Section>
      <Section n={4} title="Con quién los compartimos">
        <ul>
          <li>El aliado que prepara, envía y factura tu pedido, y la paquetería que lo entrega.</li>
          <li>Mercado Pago, para procesar el pago.</li>
          <li>Proveedores que nos dan servicio: alojamiento del sitio (Vercel), base de datos (Supabase) y envío de correos (Resend).</li>
        </ul>
        <p>
          <Pendiente>transferencias que requieren consentimiento y ubicación de los servidores</Pendiente>.
        </p>
      </Section>
      <Section n={5} title="Tus derechos">
        <p>
          Puedes pedir acceso, rectificación, cancelación u oposición (derechos ARCO), o retirar tu consentimiento,
          escribiendo a <a href="mailto:hola@viviendovino.com">hola@viviendovino.com</a>.{" "}
          <Pendiente>requisitos de la solicitud y plazo de respuesta</Pendiente>.
        </p>
      </Section>
      <Section n={6} title="Wine Scan">
        <p>
          Cuando usas Wine Scan, la foto de la etiqueta (o el nombre que escribes) se envía a nuestro proveedor de
          inteligencia artificial, Anthropic, solo para generar tu guía. <strong>La foto no se guarda</strong>: se procesa
          en el momento y se descarta. Guardamos únicamente el resultado (el vino identificado y la guía), sin tu nombre,
          tu correo ni tu dirección IP, para mejorar la función. Si nos das tu opinión con los botones de la guía, también
          la guardamos de forma anónima.
        </p>
      </Section>
      <Section n={7} title="Quiz IA">
        <p>
          Tus respuestas del quiz se usan para armar tu caja de 6 vinos y se guardan sin tu nombre ni tu dirección IP,
          para medir y mejorar el quiz. Si escribes el comentario opcional, ese texto se envía a nuestro proveedor de
          inteligencia artificial, Anthropic, solo para entender la ocasión y redactar tu resultado; te pedimos no incluir
          datos personales en él. <strong>Tu correo es opcional</strong>: solo lo pedimos después del resultado, si quieres
          que te enviemos tu perfil y su guía en PDF, y lo usamos para eso (y para novedades solo si lo marcas).
          Cualquier persona con el enlace de tu resultado puede verlo; el enlace no muestra tus respuestas, tu comentario
          ni tu correo.
        </p>
      </Section>
      <Section n={8} title="Almacenamiento en tu navegador">
        <p>
          Tu carrito y el kit que estás armando se guardan en tu propio navegador para que no se pierdan. Tus datos de
          envío no se guardan ahí. Wine Scan guarda en tu navegador un identificador anónimo para contar escaneos de la
          misma sesión; el Quiz IA guarda tu perfil y tus respuestas para que la siguiente vez solo te pregunte la ocasión
          y el presupuesto. Nada de esto está ligado a tu nombre ni a tu correo. <Pendiente>cookies de analítica, si se agregan</Pendiente>.
        </p>
      </Section>
      <Section n={9} title="Cambios a este aviso">
        <p>Publicaremos cualquier cambio en esta página, con su fecha.</p>
      </Section>
    </InfoPage>
  );
}
