import { formatMXN } from "@/lib/money";
import styles from "./Savings.module.css";

// "Ahorras $X" bajo el total de un kit cuando alguna botella tiene precio antes (tachado). Sin ahorro no se pinta.
export function Savings({ cents, tone = "light" }: { cents: number | null | undefined; tone?: "light" | "dark" }) {
  if (!cents || cents <= 0) return null;
  return <span className={`${styles.savings} ${tone === "dark" ? styles.dark : ""}`}>{`Ahorras ${formatMXN(cents)}`}</span>;
}
