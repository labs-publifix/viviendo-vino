import { GROUP_LABELS, type BottleGroup } from "@/lib/catalog/types";
import { Button, ButtonLink } from "./Button";
import { Icon } from "./Icon";
import { Price } from "./Price";
import { MonoTag } from "./Typography";
import styles from "./KitCard.module.css";

// Tarjeta de kit (Manual · 12): kit prearmado o renglón del carrito, con sus 6 botellas desglosadas.

export type KitLine = { name: string; quantity: number; priceCents: number };

export function KitCard({
  name,
  group,
  lines,
  totalCents,
  variant = "preset",
  href,
  onPrimary,
  onRemove,
}: {
  name: string;
  group: BottleGroup | null;
  lines: KitLine[];
  /** null mientras el servidor calcula el precio. */
  totalCents: number | null;
  variant?: "preset" | "cart";
  /** Kit prearmado fuera del armador: "Usar este kit" lleva al armador con el kit cargado. */
  href?: string;
  onPrimary?: () => void;
  onRemove?: () => void;
}) {
  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div>
          <MonoTag>
            <Icon name="box" size={14} /> Kit de 6{group ? ` · ${GROUP_LABELS[group]}` : ""}
          </MonoTag>
          <h3 className={styles.title}>{name}</h3>
        </div>
        {totalCents === null ? <span className={styles.pending}>—</span> : <Price cents={totalCents} size="md" />}
      </header>

      <ul className={styles.lines}>
        {lines.map((l) => (
          <li key={`${l.name}-${l.quantity}`}>
            <span className={styles.qty}>{l.quantity}×</span>
            <span className={styles.name}>{l.name}</span>
          </li>
        ))}
      </ul>

      <footer className={styles.foot}>
        <span className={styles.shipping}>Envío incluido</span>
        <div className={styles.actions}>
          {variant === "cart" && (
            <Button variant="link" onClick={onRemove}>
              Quitar
            </Button>
          )}
          {href ? (
            <ButtonLink href={href}>Usar este kit</ButtonLink>
          ) : (
            <Button variant={variant === "cart" ? "secondary" : "primary"} onClick={onPrimary}>
              {variant === "cart" ? "Editar" : "Usar este kit"}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
