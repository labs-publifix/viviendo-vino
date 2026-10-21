"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import styles from "./Field.module.css";

// Campos con etiqueta visible, ayuda y error junto al campo (ui-ux-pro-max §8; Fundamentos K-09).

type FieldBase = { label: string; hint?: ReactNode; error?: string; optional?: boolean };

function Describe({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {error && (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </>
  );
}

function describedBy(id: string, hint?: ReactNode, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({ label, hint, error, optional, id: given, ...rest }: FieldBase & ComponentProps<"input">) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> (opcional)</span>}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  id: given,
  children,
  ...rest
}: FieldBase & ComponentProps<"select">) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> (opcional)</span>}
      </label>
      <div className={styles.selectWrap}>
        <select
          id={id}
          className={`${styles.input} ${styles.select}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...rest}
        >
          {children}
        </select>
      </div>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function Checkbox({
  label,
  hint,
  error,
  id: given,
  ...rest
}: Omit<FieldBase, "label" | "optional"> & { label: ReactNode } & ComponentProps<"input">) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={styles.checkField}>
      <div className={styles.checkRow}>
        <input
          id={id}
          type="checkbox"
          className={styles.check}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...rest}
        />
        <label htmlFor={id} className={styles.checkLabel}>
          {label}
        </label>
      </div>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}
