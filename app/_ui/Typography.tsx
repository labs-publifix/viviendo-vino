import type { ReactNode } from "react";
import styles from "./Typography.module.css";

// Etiqueta mono numerada (Manual · 7.02): "01 — LA UVA". Vino sobre claro, carmín sobre oscuro.
export function NumberedLabel({ n, children, tone = "light" }: { n?: number; children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={`${styles.label} ${tone === "dark" ? styles.onDark : ""}`}>
      {n !== undefined && <span>{String(n).padStart(2, "0")} — </span>}
      {children}
    </p>
  );
}

/** Etiqueta mono neutra para datos ("TEMPRANILLO · 2021"). */
export function MonoTag({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return <span className={`${styles.tag} ${tone === "dark" ? styles.tagDark : ""}`}>{children}</span>;
}

export function Heading({
  level = 2,
  size = "section",
  children,
  id,
}: {
  level?: 1 | 2 | 3;
  size?: "hero" | "section" | "subtitle";
  children: ReactNode;
  id?: string;
}) {
  const Tag = `h${level}` as const;
  return (
    <Tag id={id} className={styles[size]}>
      {children}
    </Tag>
  );
}
