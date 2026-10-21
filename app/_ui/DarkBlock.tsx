import type { ReactNode } from "react";
import styles from "./DarkBlock.module.css";

// Bloque oscuro puntual con la atmósfera de la marca (Manual · 6): negro tinto, resplandor vino arriba
// a la derecha y eco ciruela abajo a la izquierda. Nunca negro plano.
export function DarkBlock({ children, as: Tag = "section", ...rest }: { children: ReactNode; as?: "section" | "div" } & { "aria-labelledby"?: string }) {
  return (
    <Tag className={styles.block} {...rest}>
      <div className={styles.inner}>{children}</div>
    </Tag>
  );
}
