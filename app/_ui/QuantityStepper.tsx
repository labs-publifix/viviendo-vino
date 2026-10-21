import { Icon } from "./Icon";
import styles from "./QuantityStepper.module.css";

// Control de cantidad por etiqueta dentro del kit (Fundamentos C-05). Botones de 44 px.
export function QuantityStepper({
  value,
  label,
  onIncrement,
  onDecrement,
  canIncrement,
}: {
  value: number;
  label: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
  canIncrement: boolean;
}) {
  return (
    <div className={styles.stepper} role="group" aria-label={`Cantidad de ${label} en tu kit`}>
      <button type="button" className={styles.btn} onClick={onDecrement} disabled={value === 0} aria-label={`Quitar una ${label}`}>
        <Icon name="minus" size={18} />
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button type="button" className={styles.btn} onClick={onIncrement} disabled={!canIncrement} aria-label={`Agregar una ${label}`}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
