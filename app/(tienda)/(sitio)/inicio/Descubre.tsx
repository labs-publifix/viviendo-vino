import { ArticleCard } from "@/app/_ui/ArticleCard";
import { ButtonLink } from "@/app/_ui/Button";
import { DarkBlock } from "@/app/_ui/DarkBlock";
import { Icon } from "@/app/_ui/Icon";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { IS_PREVIEW, RAFA_PHOTO } from "@/lib/about";
import { getArticles, toSummary } from "@/lib/blog/content";
import { TYPE_LABELS } from "@/lib/catalog/types";
import styles from "./descubre.module.css";

// Secciones de la portada que llevan a Quiz IA, Wine Scan, Nosotros y Blog (oct 2026).
// 05 y 06 siguen el patrón de 01 a 04 (etiqueta numerada, título, texto, botón); Nosotros y Blog son
// editoriales, sin número. Solo estructura y contenido: el quiz, el escáner y el blog llegan después.

// Botellas reales del catálogo para ilustrar la sugerencia del quiz (decorativo).
const QUIZ_BOTTLES = [
  "/img/vinos/soave-doc-2024.webp",
  "/img/vinos/pinot-grigio-delle-venezie-doc-blush-rosado-2025.webp",
  "/img/vinos/merlot-veneto-igt-2024.webp",
  "/img/vinos/langhe-nebbiolo.webp",
  "/img/vinos/montepulciano-d-abruzzo-doc-2024.webp",
  "/img/vinos/falanghina-puglia-igt.webp",
];

export async function Descubre() {
  const recientes = (await getArticles()).slice(0, 3).map(toSummary);
  return (
    <>
      <section className={`${styles.section} ${styles.teaser} ${styles.beforeDark}`} aria-labelledby="quiz-title">
        <div className={styles.copy}>
          <NumberedLabel n={5}>Quiz IA</NumberedLabel>
          <Heading id="quiz-title">¿No sabes cuál elegir? Te ayudamos.</Heading>
          <p className={styles.lede}>Contesta unas preguntas y te sugerimos un kit de 6 botellas, según lo que te gusta.</p>
          <p className={styles.detail}>
            <Icon name="clock" size={16} /> Toma unos 90 segundos.
          </p>
          <div className={styles.actions}>
            <ButtonLink href="/quiz">Hacer el quiz</ButtonLink>
          </div>
        </div>

        {/* Ilustración del quiz: avance, opciones y el kit sugerido. Decorativa. */}
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.quizCard}>
            <ol className={styles.quizSteps}>
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className={i < 2 ? styles.done : undefined} />
              ))}
            </ol>
            <ul className={styles.quizOptions}>
              {Object.values(TYPE_LABELS).map((label, i) => (
                <li key={label} className={i === 2 ? styles.picked : undefined}>
                  {label}
                </li>
              ))}
            </ul>
            <ul className={styles.quizKit}>
              {QUIZ_BOTTLES.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas
                <li key={src}><img src={src} alt="" width={880} height={1184} loading="lazy" decoding="async" /></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 06 en bloque oscuro: alterna claro y oscuro a mitad de la portada (Manual §6, bloques puntuales). */}
      <DarkBlock aria-labelledby="scan-title">
        <div className={`${styles.teaser} ${styles.reverse} ${styles.onDark}`}>
          <div className={styles.copy}>
            <NumberedLabel n={6} tone="dark">
              Wine Scan
            </NumberedLabel>
            <Heading id="scan-title">Toma una foto de la etiqueta y descubre tu vino</Heading>
            <p className={styles.lede}>
              Obtén al instante la ficha técnica y la guía de maridaje de cualquier vino. Solo escanea la etiqueta o sube una foto de ella y sabrás cómo servirlo y qué comer con él.
            </p>
            <p className={styles.detail}>
              <Icon name="camera" size={16} /> Desde tu celular.
            </p>
            <div className={styles.actions}>
              <ButtonLink href="/wine-scan" tone="dark">
                Escanear una etiqueta
              </ButtonLink>
            </div>
          </div>

          {/* Ilustración del escáner: una botella real dentro del visor de la cámara. Decorativa. */}
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.scanFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto ya optimizada */}
              <img src="/img/vinos/valpolicella-ripasso-classico-superiore-doc-2020.webp" alt="" width={880} height={1184} loading="lazy" decoding="async" />
              <span className={styles.scanCorners} />
              <span className={styles.scanLine} />
            </div>
          </div>
        </div>
      </DarkBlock>

      <section className={`${styles.section} ${styles.about}`} aria-labelledby="nosotros-title">
        {RAFA_PHOTO ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto optimizada
          <img src={RAFA_PHOTO.src} alt="Rafa Aguirre, fundador de Viviendo Vino" width={RAFA_PHOTO.width} height={RAFA_PHOTO.height} loading="lazy" className={styles.aboutPhoto} />
        ) : (
          IS_PREVIEW && (
            <div className={styles.aboutPlaceholder} role="img" aria-label="Espacio para la foto de Rafa Aguirre (pendiente)">
              <Icon name="camera" size={28} />
              <span>Foto de Rafa · pendiente</span>
              <small>Solo se ve en dev</small>
            </div>
          )
        )}
        <div className={styles.copy}>
          <NumberedLabel>Nosotros</NumberedLabel>
          <Heading id="nosotros-title">Conoce a quien está detrás de cada kit.</Heading>
          <p className={styles.lede}>
            Rafa Aguirre es el fundador de Viviendo Vino. Conoce quién es y cómo elegimos cada botella.
          </p>
          <div className={styles.actions}>
            <ButtonLink href="/nosotros" variant="secondary">
              Conocer a Rafa
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.blog}`} aria-labelledby="blog-title">
        <div className={styles.blogHead}>
          <div className={styles.copy}>
            <NumberedLabel>Blog y guías</NumberedLabel>
            <Heading id="blog-title">Aprende de vino sin complicarte.</Heading>
            <p className={styles.lede}>Artículos y guías de maridaje en PDF, explicados en palabras sencillas.</p>
          </div>
          <div className={styles.actions}>
            <ButtonLink href="/blog">Leer el blog</ButtonLink>
            <ButtonLink href="/blog#guias" variant="secondary">
              Ver guías en PDF
            </ButtonLink>
          </div>
        </div>

        {/* Los 3 artículos más recientes del blog (content/blog/), con la misma tarjeta de color. */}
        {recientes.length > 0 && (
          <ul className={styles.articles}>
            {recientes.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
