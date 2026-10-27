import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import marca from "@/data/catalogo-marca.json";
import { ButtonLink } from "@/app/_ui/Button";
import { DarkBlock } from "@/app/_ui/DarkBlock";
import { Icon } from "@/app/_ui/Icon";
import { KitCard } from "@/app/_ui/KitCard";
import { Price } from "@/app/_ui/Price";
import { Heading, MonoTag, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog } from "@/lib/catalog/repo";
import { GROUP_IMAGES, KIT_IMAGES } from "@/lib/catalog/media";
import { formatMXN } from "@/lib/money";
import { SOCIAL } from "@/lib/social";
import { Descubre } from "./Descubre";
import styles from "./inicio.module.css";

// Portada de la tienda. Con STORE_OPEN=true, proxy.ts la muestra en "/".
export const metadata: Metadata = {
  title: "Viviendo Vino · Arma tu kit de 6 botellas de vino italiano",
  description: "Elige 6 botellas de vino italiano y arma tu kit. El envío va incluido en el precio.",
};

const STEPS = [
  {
    title: "Elige tus vinos",
    text: "Cada vino pertenece a un grupo de botellas. La primera que agregas define el grupo de tu kit.",
  },
  {
    title: "Llena tus 6 lugares",
    text: "Mezcla etiquetas del mismo grupo y repite las que quieras. El armador te dice cuántas te faltan.",
  },
  {
    title: "Recíbelo en casa",
    text: "El precio que ves ya incluye el envío. Sin mínimos de compra y sin cargos al final.",
  },
];

export default async function TiendaInicio() {
  if (!storeEnabled()) notFound();
  const { groups, categories, kits } = await getCatalog();
  const fromCents = Math.min(...groups.map((g) => g.kitMinCents).filter((c) => c > 0));

  return (
    <>
      <DarkBlock aria-labelledby="hero-title" image={{ src: "/img/hero-rafa.webp", width: 1086, height: 1448, clean: true }}>
        <div className={styles.hero}>
          <NumberedLabel tone="dark">Vinos exclusivos de Viviendo Vino</NumberedLabel>
          <h1 id="hero-title" className={styles.heroTitle}>
            Arma tu <em>kit.</em>
          </h1>
          <p className={styles.heroLede}>
            Seis botellas elegidas por ti, con el envío incluido en el precio. Kits desde {formatMXN(fromCents)}.
          </p>
          <div className={styles.heroActions}>
            <ButtonLink href="/arma-tu-kit" tone="dark" size="lg">
              Arma tu kit
            </ButtonLink>
            <ButtonLink href="/vinos" variant="secondary" tone="dark" size="lg">
              Ver los vinos
            </ButtonLink>
          </div>
        </div>
      </DarkBlock>

      <section id="como-funciona" className={styles.section} aria-labelledby="como-title">
        <div className={styles.sectionHead}>
          <NumberedLabel n={1}>Cómo funciona</NumberedLabel>
          <Heading id="como-title">Seis botellas, una regla.</Heading>
          <p className={styles.lede}>Tu kit lleva vinos de un solo grupo de botellas. Dentro del grupo, mezclas como quieras.</p>
        </div>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="grupos-title">
        <div className={styles.sectionHead}>
          <NumberedLabel n={2}>Grupos de botellas</NumberedLabel>
          <Heading id="grupos-title">Elige por dónde empezar.</Heading>
        </div>
        <ul className={styles.groups}>
          {groups.map((g) => (
            <li key={g.code} className={styles.group}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas (scripts/build-home-images.mjs) */}
              <img
                src={GROUP_IMAGES[g.code].src}
                alt={GROUP_IMAGES[g.code].alt}
                width={1000}
                height={625}
                loading="lazy"
                decoding="async"
                className={styles.groupPhoto}
              />
              <div className={styles.groupHead}>
                <h3>{g.name}</h3>
                <MonoTag>
                  {g.wineCount} {g.wineCount === 1 ? "etiqueta" : "etiquetas"}
                </MonoTag>
              </div>
              <p className={styles.groupDesc}>{g.description}</p>
              <div className={styles.groupFoot}>
                <div>
                  <MonoTag>{g.fullCaseOnly ? "Caja completa de 6" : "Kit de 6"}</MonoTag>
                  <p className={styles.range}>
                    {g.kitMinCents === g.kitMaxCents ? (
                      <Price cents={g.kitMinCents} size="md" />
                    ) : (
                      <>
                        <Price cents={g.kitMinCents} size="md" unit="" /> <span className={styles.rangeSep}>a</span>{" "}
                        <Price cents={g.kitMaxCents} size="md" />
                      </>
                    )}
                  </p>
                </div>
                <Link href={`/arma-tu-kit?grupo=${g.code}`} className={styles.groupLink}>
                  Armar con {g.name} <Icon name="arrow" size={16} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="cat-title">
        <div className={styles.sectionHead}>
          <NumberedLabel n={3}>El catálogo</NumberedLabel>
          <Heading id="cat-title">{categories.reduce((s, c) => s + c.wineCount, 0)} vinos italianos.</Heading>
          <p className={styles.lede}>{marca.intro_portada}</p>
        </div>
        <ul className={styles.categories}>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/vinos#${c.slug}`} className={styles.category}>
                <span className={styles.categoryName}>{c.name}</span>
                <span className={styles.categoryMeta}>
                  <MonoTag>
                    {c.wineCount} {c.wineCount === 1 ? "vino" : "vinos"} · desde {formatMXN(c.minPriceCents)} por botella
                  </MonoTag>
                </span>
                <Icon name="arrow" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {kits.length > 0 && (
        <section className={styles.section} aria-labelledby="kits-title">
          <div className={styles.sectionHead}>
            <NumberedLabel n={4}>Kits prearmados</NumberedLabel>
            <Heading id="kits-title">¿Sin tiempo?</Heading>
            <p className={styles.lede}>
              Elige entre las selecciones recomendadas por Viviendo Vino. Agrégala tal cual a tu carrito o personalízala en el
              armador.
            </p>
          </div>
          <div className={styles.kits}>
            {kits.map((k) => (
              <KitCard
                key={k.slug}
                name={k.name}
                group={k.group}
                lines={k.items}
                totalCents={k.totalCents}
                savingsCents={k.savingsCents}
                imageUrl={k.imageUrl ?? KIT_IMAGES[k.slug]}
                href={`/arma-tu-kit?kit=${k.slug}&agregar=1`}
                customizeHref={`/arma-tu-kit?kit=${k.slug}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* 05 Quiz IA, 06 Wine Scan, Nosotros, Blog e Instagram (el espacio final antes del cierre va en Instagram). */}
      <Descubre />

      <DarkBlock aria-labelledby="cierre-title">
        <div className={styles.closing}>
          <h2 id="cierre-title" className={styles.closingTitle}>
            Tu caja, a tu <em>gusto.</em>
          </h2>
          <ButtonLink href="/arma-tu-kit" tone="dark" size="lg">
            Empieza tu kit
          </ButtonLink>
        </div>

        <section className={styles.social} aria-labelledby="redes-title">
          <h2 id="redes-title" className={styles.socialLabel}>
            Síguenos · la comunidad de Viviendo Vino
          </h2>
          <ul className={styles.socialList}>
            {SOCIAL.map((s, i) => (
              <li key={s.id}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={styles.socialRow}>
                  <span className={styles.socialNum} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.socialIcon} aria-hidden="true">
                    <Icon name={s.id} size={28} />
                  </span>
                  <span className={styles.socialName}>{s.name}</span>
                  <span className={styles.socialMeta}>
                    {[s.handle, s.note].filter(Boolean).join(" · ") || "Síguenos"}
                    <span className="vv-sr-only"> (se abre en otra pestaña)</span>
                  </span>
                  <span className={styles.socialArrow} aria-hidden="true">
                    <Icon name="arrow" size={24} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </DarkBlock>
    </>
  );
}
