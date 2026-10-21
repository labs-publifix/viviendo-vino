import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Button.module.css";

// Botón píldora (Manual · 7.07): relleno o de contorno. Sobre claro el principal es vino; sobre oscuro, carmín.

type Common = {
  variant?: "primary" | "secondary" | "link";
  tone?: "light" | "dark";
  size?: "md" | "lg";
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
};

function classes({ variant = "primary", tone = "light", size = "md", block, loading }: Omit<Common, "children">) {
  return [styles.btn, styles[variant], styles[tone], styles[size], block && styles.block, loading && styles.loading]
    .filter(Boolean)
    .join(" ");
}

export function Button({ variant, tone, size, block, loading, children, disabled, className, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button
      className={`${classes({ variant, tone, size, block, loading })} ${className ?? ""}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function ButtonLink({ variant, tone, size, block, children, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={`${classes({ variant, tone, size, block })} ${className ?? ""}`} {...rest}>
      <span>{children}</span>
    </Link>
  );
}
