import type { Metadata } from "next";
import { notFound } from "next/navigation";
import marca from "@/data/catalogo-marca.json";
import { WineCard } from "@/app/_ui/WineCard";
import { Heading, MonoTag, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog } from "@/lib/catalog/repo";
import { formatMXN } from "@/lib/money";
import styles from "./vinos.module.css";

export const metadata: Metadata = {
  title: "Vinos · Viviendo Vino",
  description: "Blancos, rosado, tintos y espumosos italianos para armar tu kit de 6 botellas con envío incluido.",
};

export default async function Vinos() {
  if (!storeEnabled()) notFound();
  const { wines, categories } = await getCatalog();

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <NumberedLabel>Catálogo</NumberedLabel>
        <Heading level={1} size="section">
          Vinos.
        </Heading>
        <p className={styles.lede}>{marca.intro_catalogo}</p>
        <nav aria-label="Categorías" className={styles.jump}>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <a href={`#${c.slug}`}>
                  {c.name} <span>{c.wineCount}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {categories.map((c, i) => {
        const list = wines.filter((w) => w.category === c.slug);
        if (list.length === 0) return null;
        return (
          <section key={c.slug} id={c.slug} className={styles.category} aria-labelledby={`${c.slug}-title`}>
            <div className={styles.categoryHead}>
              <NumberedLabel n={i + 1}>{c.name}</NumberedLabel>
              <h2 id={`${c.slug}-title`} className={styles.categoryTitle}>
                {c.name}.
              </h2>
              <p className={styles.categoryIntro}>{c.intro}</p>
              <MonoTag>
                {list.length} {list.length === 1 ? "vino" : "vinos"} · desde {formatMXN(c.minPriceCents)} por botella
              </MonoTag>
            </div>
            <ul className={styles.grid}>
              {list.map((w) => (
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
        );
      })}
    </div>
  );
}
