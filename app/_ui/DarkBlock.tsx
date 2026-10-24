import type { ReactNode } from "react";
import styles from "./DarkBlock.module.css";

// Bloque oscuro puntual con la atmósfera de la marca (Manual · 6): negro tinto, resplandor vino arriba
// a la derecha y eco ciruela abajo a la izquierda. Nunca negro plano.
// Con `image`, la foto va de fondo, tenue y velada del lado del texto; la atmósfera queda encima.
// Con `image.clean`, la imagen se ve limpia, sin velo, con corte recto: a la derecha en escritorio,
// abajo del texto en tableta y móvil.
export function DarkBlock({
  children,
  as: Tag = "section",
  image,
  ...rest
}: {
  children: ReactNode;
  as?: "section" | "div";
  image?: { src: string; width: number; height: number; clean?: boolean };
} & { "aria-labelledby"?: string }) {
  return (
    <Tag className={`${styles.block} ${image ? styles.withImage : ""} ${image?.clean ? styles.clean : ""}`} {...rest}>
      {image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto decorativa ya optimizada */}
          <img src={image.src} alt="" width={image.width} height={image.height} fetchPriority="high" className={styles.photo} />
          <span className={styles.scrim} aria-hidden="true" />
        </>
      )}
      <div className={styles.inner}>{children}</div>
    </Tag>
  );
}
