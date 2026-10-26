import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BottlePlaceholder } from "@/app/_ui/BottlePlaceholder";
import { ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { KitCard } from "@/app/_ui/KitCard";
import { Price } from "@/app/_ui/Price";
import { MonoTag, NumberedLabel } from "@/app/_ui/Typography";
import { WineCard } from "@/app/_ui/WineCard";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog, getWine } from "@/lib/catalog/repo";
import { CATEGORY_LABELS, GROUP_LABELS, TYPE_LABELS } from "@/lib/catalog/types";
import { KIT_IMAGES } from "@/lib/catalog/media";
import { formatMXN } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import styles from "./ficha.module.css";

// Ficha de vino (Fundamentos §3, 03): dato, opinión y compatibilidad "Va con los vinos de La Selezione".

const CLOSED = "__tienda-cerrada__";

export async function generateStaticParams() {
  // Producción con la tienda cerrada: un parámetro de relleno que responde 404 sin tocar la base.
  if (!storeEnabled()) return [{ slug: CLOSED }];
  const { wines } = await getCatalog();
  return wines.map((w) => ({ slug: w.slug }));
}

async function load(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  if (!storeEnabled() || slug === CLOSED) notFound();
  const { catalog, wine } = await getWine(slug);
  if (!wine) notFound();
  return { catalog, wine };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { wine } = await load(params);
  return {
    title: `${wine.name} · Viviendo Vino`,
    description: `${wine.description} ${formatMXN(wine.priceCents)} por botella, en kits de 6 con envío incluido.`,
    alternates: { canonical: `/vinos/${wine.slug}` },
  };
}

export default async function FichaVino({ params }: { params: Promise<{ slug: string }> }) {
  const { catalog, wine } = await load(params);
  const group = catalog.groups.find((g) => g.code === wine.group);
  const sameGroup = catalog.wines.filter((w) => w.group === wine.group && w.slug !== wine.slug);
  const kits = catalog.kits.filter((k) => k.items.some((i) => i.slug === wine.slug));
  const kitPrice = wine.priceCents * catalog.kitSize;

  const facts = [
    { label: "Tipo", value: TYPE_LABELS[wine.type] },
    { label: "Uva", value: wine.grape },
    { label: "Región", value: wine.region },
    { label: "Denominación", value: wine.appellation },
    { label: "Añada", value: wine.vintage ? String(wine.vintage) : null },
    { label: "Productor", value: wine.producer },
    { label: "Botella", value: `${wine.volumeMl} ml` },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: wine.name,
    description: wine.description,
    category: CATEGORY_LABELS[wine.category],
    brand: { "@type": "Brand", name: wine.producer },
    ...(wine.imageUrl ? { image: `${SITE_URL}${wine.imageUrl}` } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/vinos/${wine.slug}`,
      price: (wine.priceCents / 100).toFixed(2),
      priceCurrency: "MXN",
      availability: wine.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        // JSON generado aquí desde la base; "<" se escapa para que ningún texto cierre la etiqueta.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Ruta" className={styles.crumbs}>
        <ol>
          <li>
            <Link href="/vinos">Vinos</Link>
          </li>
          <li>
            <Link href={`/vinos#${wine.category}`}>{CATEGORY_LABELS[wine.category]}</Link>
          </li>
          <li aria-current="page">{wine.name}</li>
        </ol>
      </nav>

      <article className={styles.main}>
        <div className={styles.media}>
          {wine.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas (scripts/build-photos.mjs)
            <img src={wine.imageUrl} alt={wine.name} width={880} height={1184} fetchPriority="high" className={styles.photo} />
          ) : (
            <BottlePlaceholder kind={wine.category === "espumosos" ? "sparkling" : "still"} label={wine.name} />
          )}
        </div>

        <div className={styles.info}>
          <MonoTag>
            {wine.producer} · {TYPE_LABELS[wine.type]}
          </MonoTag>
          <h1 className={styles.title}>{wine.name}</h1>
          {wine.award && (
            <p className={styles.award}>
              <Icon name="check" size={14} /> {wine.award}
            </p>
          )}
          <p className={styles.desc}>{wine.description}</p>

          <div className={styles.buy}>
            <div className={styles.priceRow}>
              <Price cents={wine.priceCents} compareCents={wine.compareAtCents} size="lg" />
              <span className={styles.per}>por botella</span>
            </div>
            <p className={styles.compat}>
              Va con los vinos de <strong>{group?.name ?? GROUP_LABELS[wine.group]}</strong>.{" "}
              {group?.fullCaseOnly
                ? `Se vende en caja de ${catalog.kitSize}: ${formatMXN(kitPrice)} con envío incluido.`
                : `Seis de este vino: ${formatMXN(kitPrice)}, o mézclalo con ${sameGroup.length} ${sameGroup.length === 1 ? "etiqueta más" : "etiquetas más"} de su grupo.`}
            </p>
            {wine.available ? (
              <ButtonLink href={`/arma-tu-kit?vino=${wine.slug}`} size="lg" block>
                Agregar a mi kit
              </ButtonLink>
            ) : (
              <p className={styles.soldOut}>Agotado por ahora. Vuelve pronto o elige otro vino de su grupo.</p>
            )}
            <ul className={styles.perks}>
              <li>
                <Icon name="truck" size={18} /> Envío incluido en el precio
              </li>
              <li>
                <Icon name="box" size={18} /> Kits de {catalog.kitSize} botellas
              </li>
            </ul>
          </div>

          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      {sameGroup.length > 0 && (
        <section className={styles.related} aria-labelledby="mismo-grupo">
          <NumberedLabel>{group?.name ?? GROUP_LABELS[wine.group]}</NumberedLabel>
          <h2 id="mismo-grupo" className={styles.relatedTitle}>
            Caben en el mismo kit.
          </h2>
          <ul className={styles.grid}>
            {sameGroup.map((w) => (
              <li key={w.slug}>
                <WineCard
                  wine={w}
                  state={w.available ? "default" : "sold-out"}
                  href={`/vinos/${w.slug}`}
                  addHref={`/arma-tu-kit?vino=${w.slug}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {kits.length > 0 && (
        <section className={styles.related} aria-labelledby="en-kits">
          <NumberedLabel>Kits prearmados</NumberedLabel>
          <h2 id="en-kits" className={styles.relatedTitle}>
            Viene en {kits.length === 1 ? "este kit" : "estos kits"}.
          </h2>
          <div className={styles.kits}>
            {kits.map((k) => (
              <KitCard
                key={k.slug}
                name={k.name}
                group={k.group}
                lines={k.items}
                totalCents={k.totalCents}
                savingsCents={k.savingsCents}
                imageUrl={KIT_IMAGES[k.slug]}
                href={`/arma-tu-kit?kit=${k.slug}&agregar=1`}
                customizeHref={`/arma-tu-kit?kit=${k.slug}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
