import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/app/_ui/ArticleCard";
import { ButtonLink } from "@/app/_ui/Button";
import { DarkBlock } from "@/app/_ui/DarkBlock";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { getArticles, getCategories, toSummary } from "@/lib/blog/content";
import { storeEnabled } from "@/lib/catalog/enabled";
import { BlogGrid } from "./BlogGrid";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Blog y guías · Viviendo Vino",
  description: "Artículos y guías de maridaje escritos por Rafa Aguirre, en palabras sencillas. Las guías también las puedes descargar en PDF.",
};

export default function Blog() {
  if (!storeEnabled()) notFound();
  const articles = getArticles().map(toSummary);
  const [featured] = articles;
  const guides = articles.filter((a) => a.tipo === "guia");

  return (
    <>
      <header className={`${styles.section} ${styles.intro}`}>
        <NumberedLabel>Blog y guías</NumberedLabel>
        <Heading level={1} size="section">
          Aprende de vino sin complicarte.
        </Heading>
        <p className={styles.lede}>
          Artículos y guías de maridaje escritos por Rafa Aguirre, en palabras sencillas. Las guías también las puedes descargar en PDF.
        </p>
      </header>

      {featured ? (
        <>
          <section className={styles.section} aria-label="Lo más reciente">
            <ArticleCard article={featured} size="large" headingLevel={2} />
          </section>
          <section className={styles.section} aria-label="Todos los artículos">
            <BlogGrid articles={articles} categories={getCategories()} featuredSlug={featured.slug} />
          </section>
        </>
      ) : (
        <p className={`${styles.section} ${styles.empty}`}>Muy pronto, los primeros artículos.</p>
      )}

      {guides.length > 0 && (
        <section id="guias" className={`${styles.section} ${styles.guides}`} aria-labelledby="guias-title">
          <Heading id="guias-title">Guías para descargar</Heading>
          <p className={styles.lede}>Llévalas en el celular o imprímelas para la mesa.</p>
          <ul className={styles.grid}>
            {guides.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <DarkBlock aria-labelledby="blog-cierre">
        <div className={styles.closing}>
          <h2 id="blog-cierre" className={styles.closingTitle}>
            ¿Ya sabes qué vas a descorchar?
          </h2>
          <div className={styles.closingActions}>
            <ButtonLink href="/arma-tu-kit" tone="dark" size="lg">
              Armar mi kit
            </ButtonLink>
            <ButtonLink href="/quiz" variant="secondary" tone="dark" size="lg">
              Hacer el quiz
            </ButtonLink>
          </div>
        </div>
      </DarkBlock>
    </>
  );
}
