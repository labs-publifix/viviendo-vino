import { IS_PREVIEW } from "@/lib/about";
import { Icon } from "./Icon";
import styles from "./Pending.module.css";

// Hueco para contenido [PENDIENTE]. Solo se ve en el preview (dev.viviendovino.com); en producción no
// pinta nada. Dice qué falta para que se sustituya fácil por el contenido real.
export function Pending({
  label,
  variant = "text",
  lines = 3,
  className,
}: {
  label: string;
  variant?: "image" | "text" | "quote";
  lines?: number;
  className?: string;
}) {
  if (!IS_PREVIEW) return null;
  return (
    <div className={`${styles.pending} ${styles[variant]} ${className ?? ""}`} role="note" aria-label={`Pendiente: ${label}`}>
      <span className={styles.tag}>
        {variant === "image" && <Icon name="camera" size={16} />} Pendiente
      </span>
      <span className={styles.label}>{label}</span>
      {variant === "text" && (
        <span className={styles.lines} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <span key={i} style={{ width: i === lines - 1 ? "62%" : "100%" }} />
          ))}
        </span>
      )}
    </div>
  );
}
