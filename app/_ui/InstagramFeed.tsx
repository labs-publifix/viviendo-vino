import { getInstagramPosts } from "@/lib/instagram";
import { Icon } from "./Icon";
import styles from "./InstagramFeed.module.css";

// Cuadrícula de las últimas 6 publicaciones de @viviendovino (reutilizable en /nosotros y en la portada).
// Cuadros verticales 3:4 (como la cuadrícula de un perfil de Instagram) con las imágenes de Behold en su
// proporción original y srcset con el ancho real de cada tamaño; en reels, un ícono de play discreto.
// Si no hay feed, se muestran 6 cuadros de espera con el ícono de Instagram (la página nunca se rompe).

const PLACEHOLDERS = 6;

export async function InstagramFeed({ className }: { className?: string }) {
  const posts = await getInstagramPosts();

  if (posts.length === 0) {
    return (
      <ul className={`${styles.grid} ${className ?? ""}`} aria-hidden="true">
        {Array.from({ length: PLACEHOLDERS }, (_, i) => (
          <li key={i} className={styles.placeholder}>
            <Icon name="instagram" size={20} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={`${styles.grid} ${className ?? ""}`} aria-label="Últimas publicaciones de @viviendovino en Instagram">
      {posts.map((p) => (
        <li key={p.id}>
          <a className={styles.post} href={p.permalink} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- Behold ya entrega los tamaños; srcset directo */}
            <img
              src={p.src}
              srcSet={p.images.map((i) => `${i.url} ${i.width}w`).join(", ")}
              sizes="(min-width: 1248px) 190px, (min-width: 900px) calc((100vw - 104px) / 6), calc((100vw - 48px) / 3)"
              alt={p.alt}
              width={600}
              height={800}
              loading="lazy"
              decoding="async"
            />
            {p.isVideo && (
              <span className={styles.play} aria-hidden="true">
                <Icon name="play" size={14} />
              </span>
            )}
            <span className="vv-sr-only"> (se abre en Instagram)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
