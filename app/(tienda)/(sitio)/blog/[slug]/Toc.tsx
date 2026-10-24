"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/blog/content";
import styles from "./article.module.css";

// Índice del artículo, generado de los títulos de segundo nivel. En escritorio queda fijo a un lado y
// marca la sección visible; en móvil es un bloque plegable arriba del texto.
export function Toc({ items }: { items: TocItem[] }) {
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
      { rootMargin: "-80px 0px -66% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const list = (
    <ol className={styles.tocList}>
      {items.map((i) => (
        <li key={i.id}>
          <a href={`#${i.id}`} aria-current={active === i.id ? "location" : undefined}>
            {i.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <nav className={styles.tocDesktop} aria-label="En este artículo">
        <p className={styles.tocLabel}>En este artículo</p>
        {list}
      </nav>
      <details className={styles.tocMobile}>
        <summary>En este artículo</summary>
        <nav aria-label="En este artículo">{list}</nav>
      </details>
    </>
  );
}
