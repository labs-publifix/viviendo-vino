import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { InfoPage, Pendiente, Section } from "../_info/InfoPage";

export const metadata: Metadata = {
  title: "Términos y condiciones · Viviendo Vino",
  robots: { index: false, follow: true },
};

export default function Terminos() {
  if (!storeEnabled()) notFound();
  return (
    <InfoPage label="Legal" title="Términos y condiciones." updated="borrador del 22 de octubre de 2026">
      <Section n={1} title="Quiénes somos">
        <p>
          Viviendo Vino (<Pendiente>razón social y domicilio</Pendiente>) opera esta tienda en línea como canal de venta.
          El vino lo vende, prepara y envía nuestro aliado <Pendiente>razón social del aliado</Pendiente>, en Córdoba,
          Veracruz.
        </p>
      </Section>
      <Section n={2} title="Mayoría de edad">
        <p>
          Solo vendemos a personas de 18 años o más. Al comprar confirmas que tienes la edad mínima; podemos cancelar un
          pedido si no se cumple.
        </p>
      </Section>
      <Section n={3} title="Kits">
        <p>
          Cada pedido se forma con kits de exactamente 6 botellas de vinos del mismo grupo de botella. Puedes repetir
          etiquetas. Las imágenes de producto son ilustrativas.
        </p>
      </Section>
      <Section n={4} title="Precios">
        <p>
          Los precios están en pesos mexicanos e incluyen el envío. <Pendiente>impuestos incluidos en el precio</Pendiente>.
          El precio que vale es el que ves al pagar; si cambia mientras armas tu kit, te lo mostramos antes de cobrar.
        </p>
      </Section>
      <Section n={5} title="Pago">
        <p>El pago se hace con Mercado Pago, de contado. No ofrecemos meses sin intereses.</p>
      </Section>
      <Section n={6} title="Envío y entrega">
        <p>
          Ver <Link href="/envios">envíos</Link>. <Pendiente>cobertura, plazos y qué pasa si nadie recibe</Pendiente>.
        </p>
      </Section>
      <Section n={7} title="Cancelaciones, devoluciones y reembolsos">
        <p>
          <Pendiente>en qué casos, en qué plazo y cómo se reembolsa</Pendiente>.
        </p>
      </Section>
      <Section n={8} title="Factura">
        <p>Si la pides en el checkout, la emite el aliado que vende el vino.</p>
      </Section>
      <Section n={9} title="Consumo responsable">
        <p>Evita el exceso. <Pendiente>leyenda legal definitiva</Pendiente>.</p>
      </Section>
      <Section n={10} title="Cambios y contacto">
        <p>
          Podemos actualizar estos términos; la fecha de arriba indica la versión vigente. Dudas:{" "}
          <a href="mailto:hola@viviendovino.com">hola@viviendovino.com</a>. <Pendiente>legislación aplicable y tribunales</Pendiente>.
        </p>
      </Section>
    </InfoPage>
  );
}
