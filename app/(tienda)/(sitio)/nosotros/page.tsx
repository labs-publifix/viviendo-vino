import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/app/_ui/Button";
import { DarkBlock } from "@/app/_ui/DarkBlock";
import { Icon } from "@/app/_ui/Icon";
import { InstagramFeed } from "@/app/_ui/InstagramFeed";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { RAFA_CRITERIA, RAFA_FACTS, RAFA_NOTE, RAFA_PHOTO, RAFA_QUOTE, RAFA_STORY } from "@/lib/about";
import { storeEnabled } from "@/lib/catalog/enabled";
import { SOCIAL } from "@/lib/social";
import styles from "./nosotros.module.css";

// Página de Rafa Aguirre, fundador. Los textos de Rafa viven en lib/about.ts (finales desde el 26 oct 2026).

export const metadata: Metadata = {
  title: "Nosotros · Viviendo Vino",
  description: "Viviendo Vino es una forma directa de comprar buen vino. Conoce a Rafa Aguirre, quien elige cada vino.",
};

const PASOS = ["Armas tu kit de 6 botellas.", "Pagas en línea.", "Lo recibes en tu casa, con envío incluido."];
const INSTAGRAM = SOCIAL.find((s) => s.id === "instagram")!;

export default function Nosotros() {
  if (!storeEnabled()) notFound();

  return (
    <>
      {/* 1. Portada */}
      <section className={`${styles.section} ${styles.hero} ${styles.beforeDark}`} aria-labelledby="nosotros-title">
        <div className={styles.copy}>
          <NumberedLabel>Nosotros</NumberedLabel>
          <Heading level={1} size="section" id="nosotros-title">
            Conoce a quien está detrás de cada kit.
          </Heading>
          <p className={styles.lede}>Viviendo Vino es una forma directa de comprar buen vino. Él es quien lo elige.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto optimizada */}
        <img
          src={RAFA_PHOTO.src}
          alt="Rafa Aguirre, fundador de Viviendo Vino"
          width={RAFA_PHOTO.width}
          height={RAFA_PHOTO.height}
          fetchPriority="high"
          className={styles.photo}
        />
      </section>

      {/* 2. Quién es Rafa */}
      {/* En bloque oscuro: alterna con la portada clara (Manual §6, bloques puntuales). */}
      <DarkBlock aria-labelledby="rafa-title">
        <div className={`${styles.bio} ${styles.onDark}`}>
          <header className={styles.bioHead}>
            <Heading id="rafa-title">Rafa Aguirre</Heading>
            <p className={styles.subtitle}>Fundador de Viviendo Vino</p>
          </header>
          <div className={styles.bioBody}>
            {RAFA_STORY.map((p) => (
              <p key={p} className={styles.story}>
                {p}
              </p>
            ))}
            <blockquote className={styles.quote}>
              <p>{RAFA_QUOTE}</p>
              <footer>— Rafa Aguirre</footer>
            </blockquote>
            <dl className={styles.facts}>
              {RAFA_FACTS.map((f) => (
                <div key={f.value} className={styles.fact}>
                  <dt>{f.value}</dt>
                  <dd>{f.label}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.note}>{RAFA_NOTE}</p>
          </div>
        </div>
      </DarkBlock>

      {/* 3. Cómo elegimos cada vino */}
      <section className={styles.section} aria-labelledby="criterios-title">
        <div className={styles.copy}>
          <Heading id="criterios-title">Cómo elegimos cada vino</Heading>
          <p className={styles.lede}>Pocos vinos, bien elegidos y con algo único que contar.</p>
        </div>
        <ol className={styles.columns}>
          {RAFA_CRITERIA.map((c, i) => (
            <li key={c.title} className={styles.column}>
              <span className={styles.num} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/vinos" className={styles.arrowLink}>
          Ver el catálogo <Icon name="arrow" size={16} />
        </Link>
      </section>

      {/* 4. Cómo funciona */}
      <section className={styles.section} aria-labelledby="facil-title">
        <Heading id="facil-title">Así de fácil</Heading>
        <ol className={styles.columns}>
          {PASOS.map((paso, i) => (
            <li key={paso} className={styles.column}>
              <span className={styles.num} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className={styles.step}>{paso}</p>
            </li>
          ))}
        </ol>
        <p className={styles.links}>
          <Link href="/envios" className={styles.arrowLink}>
            Más sobre envíos <Icon name="arrow" size={16} />
          </Link>
          <Link href="/preguntas-frecuentes" className={styles.arrowLink}>
            Preguntas frecuentes <Icon name="arrow" size={16} />
          </Link>
        </p>
      </section>

      {/* 5. Comunidad */}
      <section className={`${styles.section} ${styles.community}`} aria-labelledby="comunidad-title">
        <div className={styles.communityHead}>
          <div className={styles.copy}>
            <Heading id="comunidad-title">Somos casi 30 mil en Instagram</Heading>
            <p className={styles.lede}>
              El vino se disfruta más cuando se comparte. Síguenos, descubre nuevas etiquetas y cuéntanos qué estás tomando. ¡Brindemos juntos!
            </p>
          </div>
          <ButtonLink href={INSTAGRAM.href} target="_blank" rel="noopener noreferrer" variant="secondary">
            <Icon name="instagram" size={18} /> Ir a @viviendovino
            <span className="vv-sr-only"> (se abre en otra pestaña)</span>
          </ButtonLink>
        </div>
        {/* Últimas 6 publicaciones (Behold, INSTAGRAM_FEED_URL); si el feed falla, cuadros de espera. */}
        <InstagramFeed />
      </section>

      {/* 6. Cierre: al constructor de kits (bloque oscuro, como el de la portada). */}
      <DarkBlock aria-labelledby="cierre-title">
        <div className={styles.closing}>
          <div className={styles.closingCopy}>
            <h2 id="cierre-title" className={styles.closingTitle}>
              Tu selección, tus reglas
            </h2>
            <p className={styles.closingText}>
              Seis vinos, infinitas formas de disfrutar. Elige las etiquetas que van contigo, combina nuevos descubrimientos con tus favoritos y crea un kit tan único como tu paladar.
            </p>
          </div>
          <div className={styles.closingActions}>
            <ButtonLink href="/arma-tu-kit" tone="dark" size="lg">
              Arma tu kit de 6 vinos →
            </ButtonLink>
            <p className={styles.closingNote}>Explora nuevos estilos y crea una experiencia hecha a tu gusto.</p>
          </div>
        </div>
      </DarkBlock>
    </>
  );
}
