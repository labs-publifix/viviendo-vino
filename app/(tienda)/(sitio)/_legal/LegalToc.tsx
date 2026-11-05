"use client";

import { useEffect, useState } from "react";
import type { LegalTocItem } from "@/lib/legal";
import styles from "./legal.module.css";

// Índice del documento. Escritorio: columna fija a la izquierda que marca la sección que se está leyendo. Móvil: bloque
// plegable arriba del texto (details/summary, operable con teclado) que se cierra al elegir una sección.
export function LegalToc({ items }: { items: LegalTocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((h): h is HTMLElement => Boolean(h));
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // La sección cuenta como activa cuando su título cruza el tercio superior de la pantalla.
      { rootMargin: "-90px 0px -66% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const list = (cerrar?: boolean) => (
    <ol className={styles.tocList}>
      {items.map((i) => (
        <li key={i.id}>
          <a
            href={`#${i.id}`}
            aria-current={active === i.id ? "location" : undefined}
            onClick={cerrar ? (e) => e.currentTarget.closest("details")?.removeAttribute("open") : undefined}
          >
            {i.n && <span className={styles.tocNum}>{i.n.padStart(2, "0")}</span>}
            <span>{i.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <nav className={styles.tocDesktop} aria-label="En este documento">
        <p className={styles.tocLabel}>En este documento</p>
        {list()}
      </nav>
      <details className={styles.tocMobile}>
        <summary>
          <span>En este documento</span>
          <span className={styles.tocCount}>{items.length} secciones</span>
        </summary>
        <nav aria-label="En este documento">{list(true)}</nav>
      </details>
    </>
  );
}
