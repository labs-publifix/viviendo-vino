import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/app/_ui/ArticleCard";
import { ButtonLink } from "@/app/_ui/Button";
import { DarkBlock } from "@/app/_ui/DarkBlock";
import { Icon } from "@/app/_ui/Icon";
import { WineCard } from "@/app/_ui/WineCard";
import colors from "@/app/_ui/blogColors.module.css";
import { IS_PREVIEW } from "@/lib/about";
import { getArticle, getArticles, getRelated } from "@/lib/blog/content";
import { AUTHOR, formatDate, typeLabel } from "@/lib/blog/meta";
import { storeEnabled } from "@/lib/catalog/enabled";
import { SITE_URL } from "@/lib/site";
import { getCatalog } from "@/lib/catalog/repo";
import { GuideDownload } from "./GuideDownload";
import { Toc } from "./Toc";
import styles from "./article.module.css";

// Artículo o guía del blog (content/blog/<slug>.md). Encabezado con el color del artículo, cuerpo claro
// con índice lateral, "En pocas palabras", vinos reales del catálogo y, en guías, la descarga del PDF.

const CLOSED = "__tienda-cerrada__";

export async function generateStaticParams() {
  if (!storeEnabled()) return [{ slug: CLOSED }];
  const slugs = (await getArticles()).map((a) => ({ slug: a.slug }));
  // Al menos un parámetro (Cache Components); los artículos que se publiquen después se generan al pedirlos.
  return slugs.length > 0 ? slugs : [{ slug: CLOSED }];
}

async function load(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  if (!storeEnabled() || slug === CLOSED) notFound();
  const article = await getArticle(slug);
  if (!article) notFound();
  return article;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await load(params);
  return {
    title: { absolute: a.tituloSeo },
    description: a.extracto,
    alternates: { canonical: `${SITE_URL}/blog/${a.slug}` },
    authors: [{ name: AUTHOR.name }],
    openGraph: {
      type: "article",
      locale: "es_MX",
      siteName: "Viviendo Vino",
      url: `${SITE_URL}/blog/${a.slug}`,
      title: a.titulo,
      description: a.extracto,
      publishedTime: a.fecha,
      ...(a.actualizado ? { modifiedTime: a.actualizado } : {}),
      authors: [AUTHOR.name],
    },
    twitter: { card: "summary_large_image", title: a.titulo, description: a.extracto },
  };
}

// Datos estructurados: artículo, ruta de navegación y preguntas frecuentes (backlog §4).
function structuredData(a: Awaited<ReturnType<typeof load>>) {
  const url = `${SITE_URL}/blog/${a.slug}`;
  const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const graph: object[] = [
    {
      "@type": "Article",
      headline: a.titulo,
      description: a.extracto,
      image: `${url}/opengraph-image`,
      datePublished: `${a.fecha}T09:00:00-06:00`,
      dateModified: `${a.actualizado ?? a.fecha}T09:00:00-06:00`,
      inLanguage: "es-MX",
      author: { "@type": "Person", name: AUTHOR.name, jobTitle: AUTHOR.role, url: `${SITE_URL}/nosotros` },
      publisher: { "@type": "Organization", name: "Viviendo Vino", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/email/logo-viviendo-vino.png` } },
      mainEntityOfPage: url,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: a.titulo, item: url },
      ],
    },
  ];
  if (a.preguntas.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: a.preguntas.map((p) => ({ "@type": "Question", name: p.pregunta, acceptedAnswer: { "@type": "Answer", text: strip(p.respuesta) } })),
    });
  }
  // "<" escapado para que el texto nunca cierre la etiqueta <script>.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await load(params);
  const { wines } = await getCatalog();
  const featuredWines = a.vinos.map((slug) => wines.find((w) => w.slug === slug)).filter((w) => w !== undefined);
  const related = await getRelated(a.slug);
  const isGuide = a.tipo === "guia" && Boolean(a.pdf);

  return (
    <article className={styles.article}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(a) }} />
      {/* 1. Encabezado con el color del artículo */}
      <header className={`${styles.header} ${colors[a.color]}`}>
        <div className={styles.headerInner}>
          <nav aria-label="Ruta" className={styles.crumbs}>
            <ol>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li aria-current="page">{typeLabel(a.tipo)}</li>
            </ol>
          </nav>
          {a.ejemplo && IS_PREVIEW && <p className={styles.sample}>Ejemplo · solo se ve en dev</p>}
          {a.programado && (
            <p className={styles.sample}>Programado · se publica el {formatDate(a.fecha)}, 9:00 am · por ahora solo se ve en dev</p>
          )}
          <h1 className={styles.title}>{a.titulo}</h1>
          <p className={styles.excerpt}>{a.extracto}</p>

          <div className={styles.byline}>
            {/* eslint-disable-next-line @next/next/no-img-element -- avatar ya optimizado */}
            <img src={AUTHOR.avatar} alt="" width={56} height={56} className={styles.avatar} />
            <div>
              <p className={styles.authorName}>{AUTHOR.name}</p>
              <p className={styles.authorRole}>{AUTHOR.role}</p>
            </div>
          </div>
          <p className={styles.dates}>
            <span>
              Publicado el <time dateTime={a.fecha}>{formatDate(a.fecha)}</time>
            </span>
            {a.actualizado && (
              <span>
                Actualizado el <time dateTime={a.actualizado}>{formatDate(a.actualizado)}</time>
              </span>
            )}
            <span className={styles.reading}>
              <Icon name="clock" size={16} /> {a.minutos} min de lectura
            </span>
          </p>
          {isGuide && (
            <div className={styles.headerAction}>
              <GuideDownload slug={a.slug} guide={a.titulo} label="Descargar guía en PDF" tone={a.color === "claro" ? "light" : "dark"} />
            </div>
          )}
        </div>
      </header>

      {/* 2. Cuerpo con índice lateral */}
      <div className={styles.layout}>
        <aside className={styles.aside}>
          <Toc items={a.toc} />
        </aside>
        <div className={styles.main}>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: a.introHtml }} />
          <section className={`${styles.summary} ${colors[a.color]}`} aria-labelledby="en-pocas-palabras">
            <h2 id="en-pocas-palabras" className={styles.summaryLabel}>
              En pocas palabras
            </h2>
            <ul>
              {a.resumen.map((r) => (
                <li key={r} dangerouslySetInnerHTML={{ __html: r }} />
              ))}
            </ul>
          </section>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: a.bodyHtml }} />

          {/* 3. Vinos del catálogo que menciona el artículo */}
          {featuredWines.length > 0 && (
            <section className={styles.winesBlock} aria-labelledby="vinos-title">
              <h2 id="vinos-title" className={styles.blockTitle}>
                Vinos de este artículo
              </h2>
              <ul className={styles.wines}>
                {featuredWines.map((w) => (
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

          {/* 4. Descarga de la guía */}
          {isGuide && (
            <section className={styles.download} aria-labelledby="descarga-title">
              <div className={`${styles.cover} ${colors[a.color]}`} aria-hidden="true">
                <span className={styles.coverTag}>Guía · PDF</span>
                <span className={styles.coverTitle}>{a.titulo}</span>
                <span className={styles.coverCifra}>{a.cifra}</span>
              </div>
              <div className={styles.downloadBody}>
                <h2 id="descarga-title">{a.titulo}</h2>
                <p>{a.extracto}</p>
                <GuideDownload slug={a.slug} guide={a.titulo} label="Descargar guía" />
              </div>
            </section>
          )}

          {/* 5. Preguntas frecuentes */}
          {a.preguntas.length > 0 && (
            <section className={styles.faq} aria-labelledby="faq-title">
              <h2 id="faq-title">Preguntas frecuentes</h2>
              {a.preguntas.map((p) => (
                <details key={p.pregunta}>
                  <summary>{p.pregunta}</summary>
                  <p dangerouslySetInnerHTML={{ __html: p.respuesta }} />
                </details>
              ))}
            </section>
          )}

          {/* 6. Autor */}
          <aside className={styles.authorCard} aria-label="Autor">
            {/* eslint-disable-next-line @next/next/no-img-element -- avatar ya optimizado */}
            <img src={AUTHOR.avatar} alt="" width={48} height={48} loading="lazy" className={styles.authorCardAvatar} />
            <p>
              Escrito por <strong>{AUTHOR.name}</strong>
            </p>
          </aside>
        </div>
      </div>

      {/* 7. Relacionados */}
      {related.length > 0 && (
        <section className={`${styles.block} ${styles.relatedBlock}`} aria-labelledby="relacionados-title">
          <h2 id="relacionados-title" className={styles.blockTitle}>
            Sigue leyendo
          </h2>
          <ul className={styles.related}>
            {related.map((r) => (
              <li key={r.slug}>
                <ArticleCard article={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 8. Cierre */}
      <DarkBlock aria-labelledby="articulo-cierre">
        <div className={styles.closing}>
          <h2 id="articulo-cierre" className={styles.closingTitle}>
            Arma tu caja de 6.
          </h2>
          <ButtonLink href="/arma-tu-kit" tone="dark" size="lg">
            Armar mi kit
          </ButtonLink>
        </div>
      </DarkBlock>
    </article>
  );
}
