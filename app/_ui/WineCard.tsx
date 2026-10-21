import Link from "next/link";
import { GROUP_LABELS, type Wine } from "@/lib/catalog/types";
import { BottlePlaceholder } from "./BottlePlaceholder";
import { Button, ButtonLink } from "./Button";
import { Icon } from "./Icon";
import { Price } from "./Price";
import { QuantityStepper } from "./QuantityStepper";
import { MonoTag } from "./Typography";
import styles from "./WineCard.module.css";

// Tarjeta de vino (Manual · 12). Estados: normal, en tu kit, no cabe en este kit, agotado.

export type WineCardState = "default" | "in-kit" | "incompatible" | "sold-out";

export function WineCard({
  wine,
  state = "default",
  quantity = 0,
  canAdd = true,
  href,
  addHref,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  wine: Wine;
  state?: WineCardState;
  quantity?: number;
  canAdd?: boolean;
  href?: string;
  /** Sin armador en la página (catálogo, ficha): "Agregar" lleva al armador con el vino elegido. */
  addHref?: string;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
}) {
  const dimmed = state === "incompatible" || state === "sold-out";
  const title = href ? (
    <Link href={href} className={styles.titleLink}>
      {wine.name}
    </Link>
  ) : (
    wine.name
  );

  return (
    <article className={`${styles.card} ${dimmed ? styles.dimmed : ""} ${state === "in-kit" ? styles.inKit : ""}`}>
      <div className={styles.media}>
        {wine.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- se cambia a next/image al tener fotos
          <img src={wine.imageUrl} alt={wine.name} className={styles.photo} />
        ) : (
          <BottlePlaceholder kind={wine.category === "espumosos" ? "sparkling" : "still"} label={wine.name} />
        )}
        {state === "in-kit" && (
          <span className={styles.badge}>
            <Icon name="check" size={14} /> {quantity} en tu kit
          </span>
        )}
      </div>

      <div className={styles.body}>
        <MonoTag>
          {wine.producer} · {GROUP_LABELS[wine.group]}
        </MonoTag>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{wine.description}</p>

        <div className={styles.foot}>
          <Price cents={wine.priceCents} size="sm" />
          {state === "sold-out" ? (
            <p className={styles.note}>Agotado por ahora</p>
          ) : state === "incompatible" ? (
            <p className={styles.note}>No cabe en este kit</p>
          ) : state === "in-kit" ? (
            <QuantityStepper
              value={quantity}
              label={wine.name}
              canIncrement={canAdd}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          ) : addHref ? (
            <ButtonLink variant="secondary" href={addHref} aria-label={`Agregar ${wine.name} a mi kit`}>
              Agregar
            </ButtonLink>
          ) : (
            <Button variant="secondary" onClick={onAdd} disabled={!canAdd} aria-label={`Agregar ${wine.name} a mi kit`}>
              Agregar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Esqueleto mientras carga el catálogo. */
export function WineCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.media} />
      <div className={styles.body}>
        <span className={styles.bar} style={{ width: "40%" }} />
        <span className={styles.bar} style={{ width: "80%", height: 18 }} />
        <span className={styles.bar} style={{ width: "95%" }} />
        <span className={styles.bar} style={{ width: "60%" }} />
      </div>
    </div>
  );
}
