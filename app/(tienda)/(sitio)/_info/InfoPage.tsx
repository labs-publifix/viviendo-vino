import type { ReactNode } from "react";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import styles from "./info.module.css";

// Páginas informativas y legales. Mientras el equipo legal no las revise, llevan el aviso de borrador
// y marcan con <Pendiente> lo que falta definir (PENDIENTES.md). No se inventan datos.

export function InfoPage({
  label,
  title,
  lede,
  updated,
  draft = true,
  children,
}: {
  label: string;
  title: string;
  lede?: string;
  updated?: string;
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={styles.page}>
      <header className={styles.head}>
        <NumberedLabel>{label}</NumberedLabel>
        <Heading level={1} size="section">
          {title}
        </Heading>
        {lede && <p className={styles.lede}>{lede}</p>}
        {draft && (
          <p className={styles.draft} role="note">
            <strong>Borrador pendiente de revisión legal.</strong> Este texto puede cambiar antes de abrir la tienda.
          </p>
        )}
        {updated && <p className={styles.updated}>Última actualización: {updated}</p>}
      </header>
      <div className={styles.body}>{children}</div>
    </article>
  );
}

/** Dato que falta definir: se ve resaltado para que nadie lo publique por error. */
export function Pendiente({ children }: { children: ReactNode }) {
  return <mark className={styles.pending}>[Por definir: {children}]</mark>;
}

export function Section({ n, title, children }: { n?: number; title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2>
        {n !== undefined && <span className={styles.num}>{String(n).padStart(2, "0")}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}
