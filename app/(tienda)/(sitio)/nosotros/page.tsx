import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/app/_ui/Button";
import { DarkBlock } from "@/app/_ui/DarkBlock";
import { Icon } from "@/app/_ui/Icon";
import { Pending } from "@/app/_ui/Pending";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { IS_PREVIEW, RAFA_CRITERIA, RAFA_PHOTO, RAFA_QUOTE, RAFA_STORY } from "@/lib/about";
import { storeEnabled } from "@/lib/catalog/enabled";
import { SOCIAL } from "@/lib/social";
import styles from "./nosotros.module.css";

// Página de Rafa Aguirre, fundador. Lo que falta de Rafa vive en lib/about.ts como [PENDIENTE]:
// placeholder en el preview y nada en producción. No se inventa biografía ni datos.

export const metadata: Metadata = {
  title: "Nosotros · Viviendo Vino",
  description: "Viviendo Vino es una forma directa de comprar buen vino. Esta es la persona que lo elige.",
};

const PASOS = ["Armas tu kit de 6 botellas.", "Pagas en línea.", "Lo recibes en tu casa, con envío incluido."];
const INSTAGRAM = SOCIAL.find((s) => s.id === "instagram")!;

export default function Nosotros() {
  if (!storeEnabled()) notFound();

  return (
    <>
      {/* 1. Portada */}
      <section className={`${styles.section} ${styles.hero}`} aria-labelledby="nosotros-title">
        <div className={styles.copy}>
          <NumberedLabel>Nosotros</NumberedLabel>
          <Heading level={1} size="section" id="nosotros-title">
            Conoce a quien está detrás de cada kit.
          </Heading>
          <p className={styles.lede}>Viviendo Vino es una forma directa de comprar buen vino. Esta es la persona que lo elige.</p>
        </div>
        {RAFA_PHOTO ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto optimizada
          <img
            src={RAFA_PHOTO.src}
            alt="Rafa Aguirre, fundador de Viviendo Vino"
            width={RAFA_PHOTO.width}
            height={RAFA_PHOTO.height}
            fetchPriority="high"
            className={styles.photo}
          />
        ) : (
          <Pending variant="image" label="Foto de Rafa Aguirre" className={styles.photo} />
        )}
      </section>

      {/* 2. Quién es Rafa */}
      <section className={`${styles.section} ${styles.bio}`} aria-labelledby="rafa-title">
        <header className={styles.bioHead}>
          <Heading id="rafa-title">Rafa Aguirre</Heading>
          <p className={styles.subtitle}>Fundador de Viviendo Vino</p>
        </header>
        <div className={styles.bioBody}>
          {RAFA_STORY ? (
            RAFA_STORY.map((p) => (
              <p key={p} className={styles.story}>
                {p}
              </p>
            ))
          ) : (
            <Pending label="Historia de Rafa con el vino, escrita con sus palabras" lines={6} />
          )}
          {RAFA_QUOTE ? (
            <blockquote className={styles.quote}>
              <p>{RAFA_QUOTE}</p>
              <footer>Rafa Aguirre</footer>
            </blockquote>
          ) : (
            <Pending variant="quote" label="Una frase de Rafa" />
          )}
        </div>
      </section>

      {/* 3. Cómo elegimos cada vino */}
      <section className={styles.section} aria-labelledby="criterios-title">
        <Heading id="criterios-title">Cómo elegimos cada vino</Heading>
        {RAFA_CRITERIA ? (
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
        ) : (
          IS_PREVIEW && (
            <ol className={styles.columns}>
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className={styles.column}>
                  <span className={styles.num} aria-hidden="true">
                    {String(n).padStart(2, "0")}
                  </span>
                  <Pending label={`Criterio real de Rafa · título y una línea`} lines={2} />
                </li>
              ))}
            </ol>
          )
        )}
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
            <Heading id="comunidad-title">Somos más de 30 mil en Instagram</Heading>
            <p className={styles.lede}>Síguenos y cuéntanos qué estás tomando.</p>
          </div>
          <ButtonLink href={INSTAGRAM.href} target="_blank" rel="noopener noreferrer" variant="secondary">
            <Icon name="instagram" size={18} /> Ir a @viviendovino
            <span className="vv-sr-only"> (se abre en otra pestaña)</span>
          </ButtonLink>
        </div>
        {/* Feed de Instagram: requiere conectar la API de Instagram (fase de funcionalidades). */}
        {IS_PREVIEW && (
          <div className={styles.feed}>
            <Pending label="Feed de Instagram de @viviendovino · se conecta en la fase de funcionalidades (API de Instagram)" lines={0} />
            <ul className={styles.feedGrid} aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <Icon name="instagram" size={20} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 6. Cierre */}
      <DarkBlock aria-labelledby="cierre-title">
        <div className={styles.closing}>
          <h2 id="cierre-title" className={styles.closingTitle}>
            Arma tu primera caja.
          </h2>
          <div className={styles.closingActions}>
            <ButtonLink href="/arma-tu-kit" tone="dark" size="lg">
              Armar mi kit
            </ButtonLink>
            <Link href="/quiz" className={styles.closingLink}>
              ¿No sabes cuál elegir? Haz el quiz <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </DarkBlock>
    </>
  );
}
