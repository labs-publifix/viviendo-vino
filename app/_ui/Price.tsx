import { discountPercent, formatMXN } from "@/lib/money";
import styles from "./Price.module.css";

// Cifra con unidad (Manual · 7.06): número en Inter ExtraBold con cifras tabulares, unidad pequeña en vino.
// Con compareCents mayor que cents, muestra antes el precio anterior tachado y después el % de descuento
// (calculado aquí). Sin compareCents se ve igual que siempre.
export function Price({
  cents,
  compareCents,
  unit = "MXN",
  size = "md",
  tone = "light",
}: {
  cents: number;
  compareCents?: number | null;
  unit?: string;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
}) {
  const off = discountPercent(compareCents, cents);
  if (off === null) {
    return (
      <span className={`${styles.price} ${styles[size]} ${tone === "dark" ? styles.dark : ""}`}>
        <span className={styles.amount}>{formatMXN(cents)}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
    );
  }
  return (
    <span className={`${styles.price} ${styles.withCompare} ${styles[size]} ${tone === "dark" ? styles.dark : ""}`}>
      <s className={styles.compare}>
        <span className="vv-sr-only">Antes </span>
        {formatMXN(compareCents!)}
      </s>
      <span className={styles.amount}>
        <span className="vv-sr-only">Ahora </span>
        {formatMXN(cents)}
      </span>
      {unit && <span className={styles.unit}>{unit}</span>}
      <span className={styles.off}>{`−${off} %`}</span>
    </span>
  );
}
