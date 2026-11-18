import type { ReactNode } from "react";
import { preload } from "react-dom";
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
  /** `srcSet` (opcional): versiones por ancho en AVIF y WebP; `sizes` dice qué ancho ocupa en pantalla. */
  image?: { src: string; width: number; height: number; clean?: boolean; srcSet?: { avif: string; webp: string }; sizes?: string };
} & { "aria-labelledby"?: string }) {
  // La foto con srcSet suele ser el elemento más grande (LCP): se precarga la versión AVIF del ancho adecuado,
  // porque React no precarga solo una <img> dentro de <picture>.
  if (image?.srcSet) {
    preload(image.srcSet.avif.split(",")[0].trim().split(" ")[0], {
      as: "image",
      type: "image/avif",
      imageSrcSet: image.srcSet.avif,
      imageSizes: image.sizes,
      fetchPriority: "high",
    });
  }
  return (
    <Tag className={`${styles.block} ${image ? styles.withImage : ""} ${image?.clean ? styles.clean : ""}`} {...rest}>
      {image && (
        <>
          {image.srcSet ? (
            // <picture> con display: contents: para el diseño, la <img> sigue siendo hija directa del bloque.
            <picture className={styles.picture}>
              <source type="image/avif" srcSet={image.srcSet.avif} sizes={image.sizes} />
              <source type="image/webp" srcSet={image.srcSet.webp} sizes={image.sizes} />
              <img src={image.src} alt="" width={image.width} height={image.height} fetchPriority="high" className={styles.photo} />
            </picture>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- foto decorativa ya optimizada
            <img src={image.src} alt="" width={image.width} height={image.height} fetchPriority="high" className={styles.photo} />
          )}
          <span className={styles.scrim} aria-hidden="true" />
        </>
      )}
      <div className={styles.inner}>{children}</div>
    </Tag>
  );
}
