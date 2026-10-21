"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import styles from "./AnnouncementBar.module.css";

// Barra de anuncios (Manual · 10.04; Fundamentos W-01). Texto corto, enlace opcional y botón para cerrar.
export function AnnouncementBar({ text, href, linkLabel }: { text: string; href?: string; linkLabel?: string }) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div className={styles.bar} role="region" aria-label="Anuncio">
      <p>
        {text}
        {href && linkLabel && (
          <>
            {" · "}
            <Link href={href}>
              {linkLabel} <Icon name="arrow" size={14} />
            </Link>
          </>
        )}
      </p>
      <button type="button" className={styles.close} onClick={() => setClosed(true)} aria-label="Cerrar anuncio">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
