import { formatMXN } from "@/lib/money";
import styles from "./Price.module.css";

// Cifra con unidad (Manual · 7.06): número en Inter ExtraBold con cifras tabulares, unidad pequeña en vino.
export function Price({
  cents,
  unit = "MXN",
  size = "md",
  tone = "light",
}: {
  cents: number;
  unit?: string;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
}) {
  return (
    <span className={`${styles.price} ${styles[size]} ${tone === "dark" ? styles.dark : ""}`}>
      <span className={styles.amount}>{formatMXN(cents)}</span>
      {unit && <span className={styles.unit}>{unit}</span>}
    </span>
  );
}
