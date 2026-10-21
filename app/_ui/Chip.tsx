import type { ComponentProps } from "react";
import styles from "./Chip.module.css";

// Chip de filtro (Manual · 7.09): píldora de contorno; activo, relleno en negro tinto.
export function Chip({ pressed, children, ...rest }: { pressed: boolean } & ComponentProps<"button">) {
  return (
    <button type="button" className={styles.chip} aria-pressed={pressed} {...rest}>
      {children}
    </button>
  );
}
