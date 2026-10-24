import Link from "next/link";
import { IS_PREVIEW } from "@/lib/about";
import type { ArticleSummary } from "@/lib/blog/content";
import { AUTHOR, formatDate, typeLabel } from "@/lib/blog/meta";
import { Icon } from "./Icon";
import colors from "./blogColors.module.css";
import styles from "./ArticleCard.module.css";

// Tarjeta de artículo o guía (blog, portada y relacionados). Sin fotos: un bloque de color con etiquetas,
// la categoría y una cifra grande; abajo, el título, el autor y el enlace. Toda la tarjeta es el enlace.
export function ArticleCard({
  article: a,
  size = "default",
  headingLevel = 3,
}: {
  article: ArticleSummary;
  size?: "default" | "large";
  headingLevel?: 2 | 3;
}) {
  const Title = `h${headingLevel}` as const;
  return (
    <Link href={`/blog/${a.slug}`} className={`${styles.card} ${styles[size]} ${colors[a.color]}`}>
      <div className={styles.block}>
        <ul className={styles.tags}>
          <li className={styles.filled}>{typeLabel(a.tipo)}</li>
          <li className={styles.outline}>
            <Icon name="clock" size={13} /> {a.minutos} min de lectura
          </li>
          {a.tipo === "guia" && a.pdf && (
            <li className={styles.outline}>
              <Icon name="file" size={13} /> Incluye PDF
            </li>
          )}
          {a.ejemplo && IS_PREVIEW && <li className={styles.sample}>Ejemplo</li>}
          {a.programado && <li className={styles.sample}>Programado</li>}
        </ul>
        <p className={styles.category}>{a.categoria}</p>
        <span className={styles.cifra} aria-hidden="true">
          {a.cifra}
        </span>
      </div>
      <div className={styles.body}>
        <Title className={styles.title}>{a.titulo}</Title>
        {size === "large" && <p className={styles.excerpt}>{a.extracto}</p>}
        <div className={styles.meta}>
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar ya optimizado */}
          <img src={AUTHOR.avatar} alt="" width={36} height={36} loading="lazy" className={styles.avatar} />
          <span className={styles.author}>{AUTHOR.name}</span>
          <time dateTime={a.fecha} className={styles.date}>
            {formatDate(a.fecha)}
          </time>
        </div>
        <span className={styles.read}>
          {a.tipo === "guia" ? "Leer la guía" : "Leer el artículo"} <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  );
}
