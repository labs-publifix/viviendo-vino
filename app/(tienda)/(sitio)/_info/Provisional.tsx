import type { ReactNode } from "react";
import { ButtonLink } from "@/app/_ui/Button";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import styles from "./provisional.module.css";

// Página provisional mínima para que ningún enlace quede roto. Se reemplaza en las siguientes tareas.
export function Provisional({ label, title, text, children }: { label: string; title: string; text: string; children?: ReactNode }) {
  return (
    <div className={styles.page}>
      <NumberedLabel>{label}</NumberedLabel>
      <Heading level={1} size="section">
        {title}
      </Heading>
      <p className={styles.text}>{text}</p>
      {children}
      <div className={styles.actions}>
        <ButtonLink href="/" variant="secondary">
          Volver al inicio
        </ButtonLink>
      </div>
    </div>
  );
}
