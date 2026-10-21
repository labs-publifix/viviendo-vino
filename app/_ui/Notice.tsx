import type { ReactNode } from "react";
import styles from "./Notice.module.css";

// Mensajes del sitio (Manual · 12): punto de color + texto. El color de estado nunca va de fondo.
export function Notice({ kind = "info", title, children }: { kind?: "info" | "ok" | "aviso" | "error"; title?: string; children: ReactNode }) {
  return (
    <div className={`${styles.notice} ${styles[kind]}`} role={kind === "error" ? "alert" : "status"}>
      <span className={styles.dot} aria-hidden="true" />
      <div>
        {title && <p className={styles.title}>{title}</p>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
