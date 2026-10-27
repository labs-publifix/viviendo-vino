"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/app/_ui/Icon";
import styles from "./select.module.css";

// Selector del panel con el estilo del sitio (el <select> nativo abre el menú del sistema, gris y con otra
// letra). Patrón "select-only combobox" de WAI-ARIA: el botón conserva el foco y anuncia la opción activa con
// aria-activedescendant. Teclado: flechas, Inicio/Fin, Enter o espacio para elegir, Escape para cerrar y
// escribir las primeras letras para saltar a una opción. En formularios envía su valor con un input oculto.

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  /** Filtros de barra: la etiqueta no se ve (queda para lectores de pantalla). */
  hideLabel?: boolean;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
  variant?: "field" | "filter";
};

export function Select({ label, hideLabel, name, value, onChange, options, placeholder = "Elige una opción", hint, error, optional, disabled, variant = "field" }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const selected = options.findIndex((o) => o.value === value);
  const current = selected >= 0 ? options[selected] : null;

  const openAt = (i: number) => {
    if (disabled || options.length === 0) return;
    setActive(Math.max(0, Math.min(options.length - 1, i)));
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
  };

  // Cierra al tocar fuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  // La opción activa siempre a la vista.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openAt(selected >= 0 ? selected : e.key === "ArrowUp" ? last : 0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) choose(active);
        else setActive((a) => Math.max(0, a - 1));
        return;
      case "Home":
        e.preventDefault();
        setActive(0);
        return;
      case "End":
        e.preventDefault();
        setActive(last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        return;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        choose(active);
        return;
    }
    // Escribir salta a la primera opción que empieza así.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  };

  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`${styles.field} ${variant === "filter" ? styles.filter : ""}`} ref={root}>
      <span id={`${id}-label`} className={hideLabel ? "vv-sr-only" : styles.label}>
        {label}
        {optional && !hideLabel && <span className={styles.optional}> (opcional)</span>}
      </span>
      <div className={styles.wrap}>
        <button
          type="button"
          role="combobox"
          className={styles.trigger}
          aria-labelledby={`${id}-label ${id}-value`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open ? `${id}-o${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openAt(selected >= 0 ? selected : 0))}
          onKeyDown={onKeyDown}
        >
          <span id={`${id}-value`} className={current ? styles.value : styles.placeholder}>
            {current ? current.label : placeholder}
          </span>
          <Icon name="chevron" size={16} />
        </button>
        {open && (
          <ul id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className={styles.list} ref={list} tabIndex={-1}>
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-o${i}`}
                data-i={i}
                role="option"
                aria-selected={i === selected}
                className={`${styles.option} ${i === active ? styles.active : ""}`}
                onPointerEnter={() => setActive(i)}
                // pointerdown + preventDefault: el botón no pierde el foco al elegir.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                <span>{o.label}</span>
                {i === selected && <Icon name="check" size={16} />}
              </li>
            ))}
          </ul>
        )}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
      {error ? (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && (
          <p className={styles.hint} id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
