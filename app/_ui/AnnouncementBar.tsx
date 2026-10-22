"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import styles from "./AnnouncementBar.module.css";

// Barra de anuncios en marquesina (Manual · 10.04; Fundamentos W-01). Los mensajes corren en bucle;
// se detiene al pasar el cursor o enfocarla, tiene botón de pausa (WCAG 2.2.2) y queda fija si la
// persona pidió reducir el movimiento. Se puede cerrar.
export function AnnouncementBar({ items, href, linkLabel }: { items: string[]; href?: string; linkLabel?: string }) {
  const [closed, setClosed] = useState(false);
  const [paused, setPaused] = useState(false);
  if (closed || items.length === 0) return null;

  const run = (copy: number) => (
    <ul className={styles.group} aria-hidden={copy > 0 || undefined}>
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
      {href && linkLabel && (
        <li>
          <Link href={href} tabIndex={copy > 0 ? -1 : undefined}>
            {linkLabel} <Icon name="arrow" size={14} />
          </Link>
        </li>
      )}
    </ul>
  );

  return (
    <div className={`${styles.bar} ${paused ? styles.paused : ""}`} role="region" aria-label="Anuncios">
      <div className={styles.viewport}>
        {/* Dos copias seguidas: al recorrer la primera, la segunda ocupa su lugar sin salto. */}
        <div className={styles.track}>
          {run(0)}
          {run(1)}
        </div>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.btn} ${styles.pauseBtn}`}
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Reanudar anuncios" : "Pausar anuncios"}
          aria-pressed={paused}
        >
          <Icon name={paused ? "play" : "pause"} size={14} />
        </button>
        <button type="button" className={styles.btn} onClick={() => setClosed(true)} aria-label="Cerrar anuncios">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
