import { GROUP_LABELS, type BottleGroup } from "@/lib/catalog/types";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Price } from "./Price";
import styles from "./KitProgress.module.css";

// Progreso del kit (Manual · 7.03 "contador de avance" y 10.02 "3 de 6"; Fundamentos C-03, C-06, C-07).
// Escritorio: panel. Móvil: barra fija inferior (variant="bar").

export const KIT_SIZE = 6;

export function KitProgress({
  count,
  totalCents,
  group,
  error,
  loading,
  variant = "panel",
  completeLabel = "Agregar kit al carrito",
  onAddToCart,
  onClear,
}: {
  count: number;
  totalCents: number;
  group: BottleGroup | null;
  error?: string | null;
  loading?: boolean;
  variant?: "panel" | "bar";
  completeLabel?: string;
  onAddToCart?: () => void;
  onClear?: () => void;
}) {
  const missing = KIT_SIZE - count;
  const complete = count === KIT_SIZE;
  const status = complete ? "Tu kit está completo." : count === 0 ? "Elige tu primera botella." : `Te ${missing === 1 ? "falta" : "faltan"} ${missing}.`;

  return (
    <section className={`${styles.kit} ${styles[variant]}`} aria-label="Tu kit">
      <div className={styles.head}>
        <p className={styles.counter}>
          <span className={styles.big}>{count}</span> de {KIT_SIZE}
        </p>
        <span className={styles.headEnd}>
          {group && <span className={styles.group}>{GROUP_LABELS[group]}</span>}
          {count > 0 && variant === "bar" && onClear && (
            <button type="button" className={styles.clearSmall} onClick={onClear}>
              Vaciar
            </button>
          )}
        </span>
      </div>

      <ol className={styles.segments} aria-hidden="true">
        {Array.from({ length: KIT_SIZE }, (_, i) => (
          <li key={i} className={i < count ? styles.filled : undefined} />
        ))}
      </ol>

      <p className={styles.status} role="status" aria-live="polite">
        {status}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          <span className={styles.dot} aria-hidden="true" /> {error}
        </p>
      )}

      <div className={styles.total}>
        <Price cents={totalCents} size={variant === "bar" ? "md" : "lg"} />
        <span className={styles.shipping}>
          <Icon name="truck" size={16} /> Envío incluido
        </span>
      </div>

      <div className={styles.actions}>
        <Button block size="lg" disabled={!complete} loading={loading} onClick={onAddToCart}>
          {complete ? completeLabel : count === 0 ? "Elige 6 botellas" : `Te ${missing === 1 ? "falta" : "faltan"} ${missing}`}
        </Button>
        {count > 0 && variant === "panel" && (
          <Button variant="link" onClick={onClear}>
            Vaciar kit
          </Button>
        )}
      </div>
    </section>
  );
}
