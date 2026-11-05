import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/app/_ui/Button";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { SITE_URL } from "@/lib/site";
import styles from "./servicios.module.css";

// /servicios (versión inicial): dos bloques con ancla (#marketing y #ia) que llevan al formulario de contacto con el
// motivo ya elegido. TODO(siguiente fase): una página por servicio con entregables, casos y cómo trabajamos; aquí no
// van precios, clientes ni cifras.

export const metadata: Metadata = {
  title: "Servicios · Viviendo Vino",
  description: "Marketing integral y experiencias con inteligencia artificial para marcas, bodegas y restaurantes del mundo del vino.",
  alternates: { canonical: `${SITE_URL}/servicios` },
};

export default function Servicios() {
  if (!storeEnabled()) notFound();
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <NumberedLabel>Servicios</NumberedLabel>
        <Heading level={1} size="section">
          Marketing y experiencias con IA para el mundo del vino.
        </Heading>
      </header>

      <div className={styles.grid}>
        <section id="marketing" className={styles.card} aria-labelledby="servicio-marketing">
          <NumberedLabel n={1}>Marketing</NumberedLabel>
          <h2 id="servicio-marketing" className={styles.title}>
            Marketing integral para marcas del mundo del vino
          </h2>
          <p>Estrategia, contenido, redes sociales y campañas para marcas del mundo del vino.</p>
          <p className={styles.nota}>En alianza con Continental Media.</p>
          <ButtonLink href="/contacto?motivo=marketing" variant="secondary">
            Cuéntanos tu proyecto
          </ButtonLink>
        </section>

        <section id="ia" className={styles.card} aria-labelledby="servicio-ia">
          <NumberedLabel n={2}>Inteligencia artificial</NumberedLabel>
          <h2 id="servicio-ia" className={styles.title}>
            Experiencias con IA para marcas y restaurantes
          </h2>
          <p>
            Experiencias interactivas con inteligencia artificial para marcas y restaurantes. Mira cómo funcionan en{" "}
            <Link href="/wine-scan">Wine Scan</Link> y en el <Link href="/quiz">Quiz</Link> de Viviendo Vino.
          </p>
          <ButtonLink href="/contacto?motivo=ia" variant="secondary">
            Cuéntanos tu proyecto
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
