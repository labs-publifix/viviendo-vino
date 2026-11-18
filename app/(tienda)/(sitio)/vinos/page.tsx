import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { JsonLd } from "@/app/_ui/JsonLd";
import { grafo, migas } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { notFound } from "next/navigation";
import marca from "@/data/catalogo-marca.json";
import { WineCard } from "@/app/_ui/WineCard";
import { Heading, MonoTag, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog } from "@/lib/catalog/repo";
import { formatMXN } from "@/lib/money";
import styles from "./vinos.module.css";

export const metadata: Metadata = seo({
  titulo: "Vinos italianos: blancos, tintos y espumosos · Viviendo Vino",
  descripcion: "Blancos, rosado, tintos y espumosos italianos para armar tu kit de 6 botellas. El envío a todo México va incluido en el precio.",
  ruta: "/vinos",
});

export default async function Vinos() {
  if (!storeEnabled()) notFound();
  const { wines, categories } = await getCatalog();

  const listado = {
    "@type": "CollectionPage",
    name: "Vinos italianos",
    url: `${SITE_URL}/vinos`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: wines.map((w, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/vinos/${w.slug}`, name: w.name })),
    },
  };

  return (
    <div className={styles.page}>
      <JsonLd data={grafo(listado, migas([["Inicio", "/"], ["Vinos", "/vinos"]]))} />
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
