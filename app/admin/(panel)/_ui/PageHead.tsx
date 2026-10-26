import type { ReactNode } from "react";
import styles from "./panel.module.css";

/** Encabezado de cada sección del panel: título, texto corto y acciones a la derecha. */
export function PageHead({ title, text, children }: { title: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <header className={styles.head}>
      <div className={styles.headText}>
        <h1 className={styles.title}>{title}</h1>
        {text && <p className={styles.lede}>{text}</p>}
      </div>
      {children && <div className={styles.headActions}>{children}</div>}
    </header>
  );
}
