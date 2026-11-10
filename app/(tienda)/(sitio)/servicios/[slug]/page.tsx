import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { CONTACTO } from "@/lib/contacto";
import { SITE_URL } from "@/lib/site";
import { SERVICIOS, rutaServicio, servicioPorSlug, type Seccion, type Servicio } from "@/lib/servicios/contenido";
import { enLinea } from "@/lib/servicios/render";
import { ServicioForm } from "./ServicioForm";
import styles from "./servicio.module.css";

// Página interna de un servicio: hero con foto a todo el ancho, introducción, tarjetas numeradas, cómo trabajamos,
// respaldo, cierre con WhatsApp y formulario. Textos de lib/servicios/contenido.ts (documentos finales, tal cual).

export function generateStaticParams() {
  return SERVICIOS.map((s) => ({ slug: s.slug }));
}

async function cargar(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return servicioPorSlug(slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await cargar(params);
  if (!s) return {};
  const url = `${SITE_URL}${rutaServicio(s.slug)}`;
  const og = `${SITE_URL}/img/servicios/${s.slug}/og.jpg`;
  return {
    title: s.seo.titulo,
    description: s.seo.descripcion,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "es_MX", siteName: "Viviendo Vino", url, title: s.seo.titulo, description: s.seo.descripcion, images: [{ url: og, width: 1200, height: 630, alt: s.hero.alt }] },
    twitter: { card: "summary_large_image", title: s.seo.titulo, description: s.seo.descripcion, images: [og] },
  };
}

/** WhatsApp al número oficial con el mensaje del servicio. */
const whatsappDe = (s: Servicio) => CONTACTO.whatsapp.href.replace(/\?text=.*/, `?text=${encodeURIComponent(s.whatsapp)}`);

const Html = ({ texto, as: Tag = "p", className }: { texto: string; as?: "p" | "span"; className?: string }) => (
  <Tag className={className} dangerouslySetInnerHTML={{ __html: enLinea(texto) }} />
);

function Hero({ s }: { s: Servicio }) {
  const base = `/img/servicios/${s.slug}`;
  return (
    <header className={styles.hero}>
      <picture className={styles.heroMedia}>
        <source media="(max-width: 767.98px)" type="image/avif" srcSet={`${base}/alto-480.avif 480w, ${base}/alto-720.avif 720w, ${base}/alto-960.avif 960w`} sizes="100vw" />
        <source media="(max-width: 767.98px)" type="image/webp" srcSet={`${base}/alto-480.webp 480w, ${base}/alto-720.webp 720w, ${base}/alto-960.webp 960w`} sizes="100vw" />
        <source type="image/avif" srcSet={`${base}/ancho-960.avif 960w, ${base}/ancho-1440.avif 1440w, ${base}/ancho-1920.avif 1920w, ${base}/ancho-2560.avif 2560w`} sizes="100vw" />
        {/* Imágenes ya optimizadas por breakpoint (scripts/build-servicios-images.mjs). */}
        <img
          src={`${base}/ancho-1440.webp`}
          srcSet={`${base}/ancho-960.webp 960w, ${base}/ancho-1440.webp 1440w, ${base}/ancho-1920.webp 1920w, ${base}/ancho-2560.webp 2560w`}
          sizes="100vw"
          width={1440}
          height={810}
          alt={s.hero.alt}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <span className={styles.scrim} aria-hidden="true" />
      <div className={styles.heroInner}>
        <NumberedLabel tone="dark">Servicios</NumberedLabel>
        <h1 className={styles.heroTitle}>{s.hero.titulo}</h1>
        <p className={styles.heroSub}>{s.hero.subtitulo}</p>
        <div className={styles.actions}>
          <a className={styles.whatsapp} href={whatsappDe(s)} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={20} />
            {s.hero.principal}
            <span className="vv-sr-only"> (se abre en otra pestaña)</span>
          </a>
          <ButtonLink href={`#${s.hero.secundario.ancla}`} variant="secondary" tone="dark" size="lg">
            {s.hero.secundario.texto}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function SeccionView({ sec, i }: { sec: Seccion; i: number }) {
  const id = `sec-${i}`;
  switch (sec.tipo) {
    case "intro":
      return (
        <section className={styles.intro} aria-label="Introducción">
          <Html texto={sec.texto} className={styles.introText} />
        </section>
      );
    case "ejemplos":
      return (
        <section className={styles.section} id="ejemplos" aria-labelledby={id}>
          <header className={styles.head}>
            <Heading level={2} id={id}>
              {sec.titulo}
            </Heading>
            <Html texto={sec.texto} className={styles.lede} />
          </header>
          <ul className={styles.ejemplos}>
            {sec.ejemplos.map((e) => (
              <li key={e.titulo} className={styles.card}>
                <h3 className={styles.cardTitle}>{e.titulo}</h3>
                <Html texto={e.texto} />
                <a className={styles.cardLink} href={e.enlace.href}>
                  {e.enlace.texto} <Icon name="arrow" size={16} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      );
    case "servicios":
      return (
        <section className={styles.section} aria-labelledby={id}>
          <header className={styles.head}>
            <Heading level={2} id={id}>
              {sec.titulo}
            </Heading>
            {sec.texto && <Html texto={sec.texto} className={styles.lede} />}
          </header>
          {sec.grupos.map((g, gi) => (
            <div key={g.titulo ?? gi} className={styles.grupo}>
              {g.titulo && (
                <div className={styles.grupoHead}>
                  <h3 className={styles.grupoTitle}>{g.titulo}</h3>
                  {g.texto && <Html texto={g.texto} className={styles.grupoText} />}
                </div>
              )}
              <ol className={styles.cards}>
                {g.tarjetas.map((t, ti) => (
                  <li key={t.titulo} className={styles.card}>
                    <span className={styles.num}>{String(ti + 1).padStart(2, "0")}</span>
                    {g.titulo ? <h4 className={styles.cardTitle}>{t.titulo}</h4> : <h3 className={styles.cardTitle}>{t.titulo}</h3>}
                    <Html texto={t.texto} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      );
    case "pasos":
      return (
        <section className={styles.section} aria-labelledby={id}>
          <header className={styles.head}>
            <Heading level={2} id={id}>
              {sec.titulo}
            </Heading>
          </header>
          <ol className={styles.pasos}>
            {sec.pasos.map((p, pi) => (
              <li key={p.titulo}>
                <span className={styles.pasoNum}>{String(pi + 1).padStart(2, "0")}</span>
                <h3 className={styles.pasoTitle}>{p.titulo}</h3>
                <Html texto={p.texto} />
              </li>
            ))}
          </ol>
        </section>
      );
    case "respaldo":
      return (
        <section className={`${styles.section} ${styles.respaldoWrap}`} aria-labelledby={id}>
          <div className={`${styles.respaldo} ${sec.rafael ? styles.conFoto : ""}`}>
            {sec.rafael && (
              // eslint-disable-next-line @next/next/no-img-element -- foto ya optimizada
              <img src="/img/rafa.webp" alt="Rafael Aguirre Palencia, fundador de Viviendo Vino" width={768} height={1024} loading="lazy" className={styles.foto} />
            )}
            <div className={styles.respaldoText}>
              <Heading level={2} size="subtitle" id={id}>
                {sec.titulo}
              </Heading>
              {sec.parrafos.map((p) => (
                <Html key={p.slice(0, 40)} texto={p} />
              ))}
            </div>
          </div>
        </section>
      );
  }
}

function ServicioPage({ s }: { s: Servicio }) {
  return (
    <article className={styles.page}>
      <Hero s={s} />
      {s.secciones.map((sec, i) => (
        <SeccionView key={i} sec={sec} i={i} />
      ))}

      <section className={styles.cierre} aria-labelledby="cierre-titulo">
        <div className={styles.cierreInner}>
          <h2 id="cierre-titulo" className={styles.cierreTitle}>
            {s.cierre.titulo}
          </h2>
          <p className={styles.cierreText}>{s.cierre.texto}</p>
          <div className={styles.actions}>
            <a className={styles.whatsapp} href={whatsappDe(s)} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={20} />
              {s.cierre.principal}
              <span className="vv-sr-only"> (se abre en otra pestaña)</span>
            </a>
            <ButtonLink href="#contacto" variant="secondary" tone="dark" size="lg">
              {s.cierre.secundario}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className={styles.contacto} id="contacto" aria-labelledby="contacto-titulo">
        <div className={styles.contactoInner}>
          <header className={styles.head}>
            <NumberedLabel>Contacto</NumberedLabel>
            <Heading level={2} id="contacto-titulo">
              Envíanos un mensaje
            </Heading>
          </header>
          <ServicioForm motivo={s.motivo} servicio={s.nombre} />
        </div>
      </section>
    </article>
  );
}

async function Contenido({ params }: { params: Promise<{ slug: string }> }) {
  const s = await cargar(params);
  if (!s) notFound();
  return <ServicioPage s={s} />;
}

// Dentro de <Suspense>: al renovarse la caché del marco la página se regenera sin conocer el slug (igual que el blog).
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!storeEnabled()) notFound();
  return (
    <Suspense>
      <Contenido params={params} />
    </Suspense>
  );
}
