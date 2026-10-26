import { GROUP_LABELS, type BottleGroup } from "@/lib/catalog/types";
import { Button, ButtonLink } from "./Button";
import { Icon } from "./Icon";
import { Price } from "./Price";
import { Savings } from "./Savings";
import { MonoTag } from "./Typography";
import styles from "./KitCard.module.css";

// Tarjeta de kit (Manual · 12): kit prearmado o renglón del carrito, con sus 6 botellas desglosadas.

export type KitLine = { name: string; quantity: number; priceCents: number };

export function KitCard({
  name,
  group,
  lines,
  totalCents,
  savingsCents,
  variant = "preset",
  imageUrl,
  href,
  customizeHref,
  onPrimary,
  onRemove,
  onDuplicate,
}: {
  name: string;
  group: BottleGroup | null;
  lines: KitLine[];
  /** null mientras el servidor calcula el precio. */
  totalCents: number | null;
  /** "Ahorras $X" bajo el total si alguna botella tiene precio antes. */
  savingsCents?: number;
  variant?: "preset" | "cart";
  /** Foto del kit (solo prearmados). */
  imageUrl?: string;
  /** Kit prearmado fuera del armador: "Agregar este kit" lo pone en el carrito. */
  href?: string;
  /** Abre el kit en el armador para cambiar botellas. */
  customizeHref?: string;
  onPrimary?: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
}) {
  return (
    <article className={`${styles.card} ${imageUrl ? styles.withImage : ""}`}>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas (scripts/build-home-images.mjs)
        <img src={imageUrl} alt={`Kit ${name}: ${lines.map((l) => `${l.quantity} ${l.name}`).join(", ")}`} width={880} height={660} loading="lazy" decoding="async" className={styles.photo} />
      )}
      <header className={styles.head}>
        <div>
          <MonoTag>
            <Icon name="box" size={14} /> Kit de 6{group ? ` · ${GROUP_LABELS[group]}` : ""}
          </MonoTag>
          <h3 className={styles.title}>{name}</h3>
        </div>
        {totalCents === null ? (
          <span className={styles.pending}>—</span>
        ) : savingsCents ? (
          <span className={styles.priceStack}>
            <Price cents={totalCents} size="md" />
            <Savings cents={savingsCents} />
          </span>
        ) : (
          <Price cents={totalCents} size="md" />
        )}
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
          {variant === "cart" && onDuplicate && (
            <Button variant="link" onClick={onDuplicate}>
              Duplicar
            </Button>
          )}
          {customizeHref && (
            <ButtonLink href={customizeHref} variant="link">
              Personalizar
            </ButtonLink>
          )}
          {href ? (
            <ButtonLink href={href}>Agregar este kit</ButtonLink>
          ) : (
            <Button variant={variant === "cart" ? "secondary" : "primary"} onClick={onPrimary}>
              {variant === "cart" ? "Editar" : "Agregar este kit"}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
