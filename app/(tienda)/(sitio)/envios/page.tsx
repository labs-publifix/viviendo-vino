import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { InfoPage, Pendiente, Section } from "../_info/InfoPage";

export const metadata: Metadata = {
  title: "Envíos · Viviendo Vino",
  description: "El envío va incluido en el precio de cada kit de 6 botellas y no hay cargos al final.",
};

export default function Envios() {
  if (!storeEnabled()) notFound();
  return (
    <InfoPage label="Envíos" title="El envío ya va en el precio." lede="El envío va incluido en cada kit y no hay cargos al final." updated="borrador del 22 de octubre de 2026">
      <Section n={1} title="Cuánto cuesta">
        <p>
          Nada extra. Cada kit de 6 botellas incluye su envío desde el primer kit. En el carrito y en el checkout el
          envío aparece como <strong>incluido</strong>.
        </p>
      </Section>
      <Section n={2} title="Quién lo envía">
        <p>
          Viviendo Vino es la tienda. Tu pedido lo prepara y lo envía nuestro aliado en Córdoba, Veracruz,{" "}
          <Pendiente>nombre del aliado</Pendiente>.
        </p>
      </Section>
      <Section n={3} title="A dónde enviamos">
        <p>
          <Pendiente>zonas y códigos postales con cobertura</Pendiente>. Si tu código postal no tiene cobertura, te lo
          diremos en el checkout, antes de pagar.
        </p>
      </Section>
      <Section n={4} title="Cuánto tarda">
        <p>
          <Pendiente>plazo de preparación y de entrega por zona</Pendiente>. Cuando tu pedido salga, te enviamos por
          correo la paquetería y el número de guía.
        </p>
      </Section>
      <Section n={5} title="Al recibir">
        <p>
          Solo vendemos a mayores de 18 años. <Pendiente>requisitos al recibir, por ejemplo identificación</Pendiente>.
        </p>
      </Section>
      <Section n={6} title="Si algo llega mal">
        <p>
          Escríbenos a <a href="mailto:hola@viviendovino.com">hola@viviendovino.com</a> con tu número de pedido y una foto
          de la caja y las botellas. <Pendiente>plazo para reportar y cómo se repone o reembolsa</Pendiente>.
        </p>
        <p>
          Más dudas en <Link href="/preguntas-frecuentes">preguntas frecuentes</Link>.
        </p>
      </Section>
    </InfoPage>
  );
}
