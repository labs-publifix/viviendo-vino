import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContactoDatos } from "@/app/_ui/ContactoDatos";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { motivoDeUrl } from "@/lib/contacto-form";
import { SITE_URL } from "@/lib/site";
import { ContactoForm } from "./ContactoForm";
import styles from "./contacto.module.css";

// /contacto: formulario (Resend, sin guardar mensajes) y, al lado, los datos de contacto de lib/contacto.ts.
// ?motivo=pedido|marketing|ia|otro preselecciona el motivo.

export const metadata: Metadata = {
  title: "Contacto · Viviendo Vino",
  description: "Escríbenos sobre tu pedido, tus etiquetas, nuestros servicios para el mundo del vino o lo que necesites. También por teléfono.",
  alternates: { canonical: `${SITE_URL}/contacto` },
};

async function FormConMotivo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <ContactoForm motivoInicial={motivoDeUrl(sp.motivo)} />;
}

export default function Contacto({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!storeEnabled()) notFound();
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <NumberedLabel>Contacto</NumberedLabel>
        <Heading level={1} size="section">
          Escríbenos.
        </Heading>
        <p className={styles.lede}>Cuéntanos qué necesitas: un pedido, una duda o un proyecto para tu marca.</p>
      </header>
      <div className={styles.layout}>
        <Suspense fallback={<ContactoForm motivoInicial="" />}>
          <FormConMotivo searchParams={searchParams} />
        </Suspense>
        <aside className={styles.aside} aria-labelledby="contacto-datos">
          <h2 id="contacto-datos" className={styles.asideTitle}>
            Otras formas de contactarnos
          </h2>
          <ContactoDatos />
        </aside>
      </div>
    </div>
  );
}
