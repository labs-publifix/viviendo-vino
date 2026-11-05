import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { ButtonLink } from "@/app/_ui/Button";
import { Icon, type IconName } from "@/app/_ui/Icon";
import { Price } from "@/app/_ui/Price";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog } from "@/lib/catalog/repo";
import type { Wine } from "@/lib/catalog/types";
import { SITE_URL } from "@/lib/site";
import { EJEMPLO_WINE_SCAN as EJ } from "@/lib/wine-scan/ejemplo";
import { BarraEscanear, BotonEscanear } from "./Escanear";
import { Scanner } from "./Scanner";
import styles from "./landing.module.css";

// Wine Scan como landing. En el celular, lo primero sigue siendo el escáner (foto de la etiqueta → guía); en
// escritorio, el QR para abrirlo en el celular y la foto. La decisión de qué vista se ve es de CSS (puntero táctil y
// ancho), sin parpadeo al cargar. Debajo: cómo funciona, qué recibes (con un ejemplo real), usos, tips y preguntas.

export const metadata: Metadata = {
  title: "Wine Scan: fotografía la etiqueta y conoce tu vino | Viviendo Vino",
  description:
    "Toma una foto de la etiqueta de cualquier vino y recibe gratis, sin registro, una guía: qué es, cómo se siente, cómo servirlo y con qué combina.",
  alternates: { canonical: `${SITE_URL}/wine-scan` },
};

const HOST = /^[a-z0-9.-]+(:\d{2,5})?$/i;
// GIF transparente de 1 px: en la vista móvil la foto del hero no se descarga.
const VACIO = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
// Misma condición que la vista móvil (ver landing.module.css: .mobile / .desktop) y que el ancho mínimo de la foto.
const SIN_FOTO = "(pointer: coarse) and (max-width: 1024px), (max-width: 1023.98px)";

// El QR apunta al mismo sitio donde se abre (dev o producción). Se genera aquí, sin servicios externos.
async function DesktopQr() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const url = HOST.test(host) ? `${host.startsWith("localhost") ? "http" : "https"}://${host}/wine-scan` : `${SITE_URL}/wine-scan`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0a0206", light: "#00000000" } });
  return <div className={styles.qrCode} role="img" aria-label="Código QR para abrir Wine Scan en tu celular" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function QrCard({ titleId, nivel = 2 }: { titleId: string; nivel?: 2 | 3 }) {
  const Titulo = `h${nivel}` as const;
  return (
    <div className={styles.qrCard}>
      <Suspense fallback={<div className={styles.qrCode} aria-hidden="true" />}>
        <DesktopQr />
      </Suspense>
      <div className={styles.qrText}>
        <Titulo id={titleId} className={styles.qrTitle}>
          Ábrelo desde tu celular
        </Titulo>
        <p>Escanea este código con la cámara de tu celular. Wine Scan usa la cámara para leer la etiqueta, así que funciona solo en el celular.</p>
      </div>
    </div>
  );
}

const PASOS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "camera", titulo: "Fotografía la etiqueta", texto: "De frente, con buena luz y completa en el encuadre." },
  { icon: "search", titulo: "La analizamos", texto: "Leemos productor, nombre, uva y denominación, sin importar el idioma." },
  { icon: "file", titulo: "Recibe tu guía", texto: "Qué es, cómo se siente, cómo servirlo y con qué combina." },
];

const BLOQUES = [
  { titulo: "Qué es", texto: "El nombre, el productor, la denominación, la región y el país, la uva principal y qué tan clara fue la lectura." },
  { titulo: "Cómo se siente", texto: "Sus aromas y su estilo, con cuerpo, acidez y dulzor en una escala de cinco niveles." },
  { titulo: "Cómo servirlo", texto: "La temperatura ideal, la copa, si conviene abrirlo antes y un consejo para el clima de México." },
  { titulo: "Con qué combina", texto: "Tipos de plato que le van y por qué, para que elijas con lo que tengas a la mano." },
];

const USOS: { icon: IconName; titulo: string; texto: string }[] = [
  { icon: "cutlery", titulo: "En el restaurante", texto: "Antes de pedir, entiende qué hay en la carta." },
  { icon: "store", titulo: "En la tienda", texto: "Compara botellas sin preguntar a nadie." },
  { icon: "gift", titulo: "Con un regalo", texto: "Descubre qué te regalaron y cómo disfrutarlo." },
  { icon: "home", titulo: "En casa", texto: "Sabe a qué temperatura servirlo y con qué acompañarlo." },
];

const TIPS: { icon: IconName; texto: string }[] = [
  { icon: "label", texto: "La etiqueta de frente" },
  { icon: "sun", texto: "Con buena luz" },
  { icon: "ban", texto: "Sin reflejos ni dedos encima" },
  { icon: "frame", texto: "Que se vea completa" },
];

const CONFIANZA: { icon: IconName; texto: string }[] = [
  { icon: "tag", texto: "Gratis y sin registro" },
  { icon: "lock", texto: "La foto no se guarda: solo se usa para armar tu guía" },
  { icon: "globe", texto: "Funciona con etiquetas en cualquier idioma" },
  { icon: "info", texto: "Estimaciones orientativas, no una cata profesional" },
];

const PREGUNTAS: { q: string; a: string }[] = [
  { q: "¿Tiene costo?", a: "No, es gratis." },
  { q: "¿Necesito registrarme?", a: "No. Abres Wine Scan, tomas la foto y listo." },
  { q: "¿Guardan mi foto?", a: "No. La foto solo se usa para armar tu guía." },
  // TODO(confirmar): ¿la guía funciona igual con vinos que no vende Viviendo Vino? El texto actual de la página dice
  // "cualquier vino"; el vino parecido de la tienda solo aparece cuando hay uno.
  { q: "¿Funciona con vinos que ustedes no venden?", a: "Sí, funciona con la etiqueta de cualquier vino. Cuando tenemos uno parecido en la tienda, te lo sugerimos al final de la guía." },
  { q: "¿Y si la etiqueta está en otro idioma?", a: "Funciona con etiquetas en cualquier idioma." },
  { q: "¿Por qué solo en celular?", a: "Porque usa la cámara para leer la etiqueta. En computadora puedes escanear el código QR para abrirlo en tu celular." },
  // TODO(confirmar): no se incluyen respuestas sobre etiquetas ilegibles ni sobre qué tan exacta es la guía.
];

/** Teléfono hecho en HTML/CSS con el resultado de ejemplo, condensado. */
function Telefono({ vino }: { vino: Wine | null }) {
  const resumen = `${EJ.vino} de ${EJ.productor}, ${EJ.uva}. Cuerpo ${EJ.perfil[0].texto.toLowerCase()}, acidez ${EJ.perfil[1].texto.toLowerCase()}, ${EJ.perfil[2].texto.toLowerCase()}. Servir a ${EJ.temperatura} °C.`;
  return (
    <figure className={styles.phoneWrap}>
      <figcaption className={styles.mockTag}>Ejemplo de resultado</figcaption>
      <div className={styles.phone} role="img" aria-label={`Ejemplo de resultado de Wine Scan: ${resumen}`}>
        <div className={styles.screen} aria-hidden="true">
          <span className={styles.notch} />
          <div className={styles.mWhat}>
            {vino?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto del catálogo ya optimizada
              <img src={vino.imageUrl} alt="" width={880} height={1184} loading="lazy" className={styles.mBottle} />
            ) : (
              <span className={styles.mBottle} />
            )}
            <div>
              <p className={styles.mLabel}>01 — Qué es</p>
              <p className={styles.mName}>{EJ.vino}</p>
              <p className={styles.mMeta}>{EJ.meta.join(" · ")}</p>
              <ul className={styles.mChips}>
                <li className={styles.mOk}>{EJ.confianza}</li>
                <li>{EJ.uva}</li>
              </ul>
            </div>
          </div>
          <div className={styles.mBlock}>
            <p className={styles.mLabel}>02 — Cómo se siente</p>
            {EJ.perfil.map((p) => (
              <div key={p.etiqueta} className={styles.mScale}>
                <span>{p.etiqueta}</span>
                <span>{p.texto}</span>
                <span className={styles.mTrack}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= p.nivel ? styles.mOn : undefined} />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.mBlock}>
            <p className={styles.mLabel}>03 — Cómo servirlo</p>
            <p className={styles.mTemp}>
              {EJ.temperatura}
              <span> °C</span>
            </p>
            <p className={styles.mMeta}>{EJ.copa}</p>
          </div>
        </div>
      </div>
    </figure>
  );
}

/** Tarjeta del vino parecido: nombre, foto y precio del catálogo real; "Agregar a mi kit" usa el flujo de siempre. */
function Parecido({ vino }: { vino: Wine }) {
  return (
    <article className={styles.rec} aria-labelledby="ws-parecido">
      {vino.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- foto del catálogo ya optimizada
        <img src={vino.imageUrl} alt={`Botella de ${vino.name}`} width={880} height={1184} loading="lazy" className={styles.recImg} />
      )}
      <div className={styles.recBody}>
        <p className={styles.recLabel}>Un vino parecido de Viviendo Vino</p>
        <h4 id="ws-parecido" className={styles.recName}>
          {vino.name}
        </h4>
        <p className={styles.recPrice}>
          <Price cents={vino.priceCents} size="sm" /> <span>por botella</span>
        </p>
        <ButtonLink href={`/arma-tu-kit?vino=${vino.slug}`} variant="secondary">
          Agregar a mi kit
        </ButtonLink>
      </div>
    </article>
  );
}

function Recibes({ vino }: { vino: Wine | null }) {
  return (
    <section className={styles.section} aria-labelledby="ws-recibes">
      <header className={styles.head}>
        <NumberedLabel>Qué recibes</NumberedLabel>
        <Heading level={2} id="ws-recibes">
          Una guía completa de cada botella.
        </Heading>
      </header>
      <div className={styles.recibes}>
        <div className={styles.phoneCol}>
          <Telefono vino={vino} />
        </div>
        <div className={styles.recibesCol}>
          <ol className={styles.bloques}>
            {BLOQUES.map((b, i) => (
              <li key={b.titulo}>
                <NumberedLabel n={i + 1}>{b.titulo}</NumberedLabel>
                <p>{b.texto}</p>
              </li>
            ))}
          </ol>
          <div className={styles.extras}>
            <div className={styles.extra}>
              <NumberedLabel n={5}>Un dato</NumberedLabel>
              <h3 className={styles.extraTitle}>Un dato curioso de cada vino</h3>
              <p>{EJ.dato}</p>
            </div>
            <div className={styles.extra}>
              <h3 className={styles.extraTitle}>Un vino parecido de nuestra tienda, cuando aplica</h3>
              {/* El ejemplo usa el Soave DOC 2024; puede cambiarse por otro vino en lib/wine-scan/ejemplo.ts. */}
              {vino?.available && <Parecido vino={vino} />}
            </div>
          </div>
          <p className={styles.fine}>El perfil es una estimación según la uva, la región y el estilo; no sustituye una cata.</p>
        </div>
      </div>
    </section>
  );
}

async function RecibesConVino() {
  let vino: Wine | null = null;
  try {
    vino = (await getCatalog()).wines.find((w) => w.slug === EJ.parecidoSlug) ?? null;
  } catch {
    // Sin catálogo, la sección se ve igual, sin la foto ni la tarjeta del vino parecido.
  }
  return <Recibes vino={vino} />;
}

export default function WineScanPage() {
  if (!storeEnabled()) notFound();
  return (
    <div className={styles.page}>
      {/* 1. Hero */}
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <header className={styles.intro}>
            <NumberedLabel>Wine Scan</NumberedLabel>
            <Heading level={1} size="section">
              Fotografía la etiqueta. Entérate de todo.
            </Heading>
            <p className={styles.lede}>
              Toma una foto de la etiqueta de cualquier vino y recibe una guía: qué es, cómo se siente, cómo servirlo y con qué combina.
            </p>
          </header>

          <div className={styles.mobile} id="ws-hero">
            <Scanner />
          </div>

          <section className={styles.desktop} aria-labelledby="qr-title">
            <QrCard titleId="qr-title" />
            <ul className={styles.micro}>
              <li>Gratis</li>
              <li>Sin registro</li>
              <li>La foto no se guarda</li>
            </ul>
          </section>
        </div>

        <div className={styles.heroMedia}>
          <picture>
            <source media={SIN_FOTO} srcSet={VACIO} />
            <source type="image/avif" srcSet="/img/wine-scan/hero-432.avif 432w, /img/wine-scan/hero-576.avif 576w, /img/wine-scan/hero-688.avif 688w" sizes="(min-width: 1280px) 520px, 40vw" />
            <img
              src="/img/wine-scan/hero-688.webp"
              srcSet="/img/wine-scan/hero-432.webp 432w, /img/wine-scan/hero-576.webp 576w, /img/wine-scan/hero-688.webp 688w"
              sizes="(min-width: 1280px) 520px, 40vw"
              width={688}
              height={860}
              fetchPriority="high"
              alt="Ilustración de un grupo de amigos en una mesa con vino y tabla de quesos mirando una etiqueta en un celular"
              className={styles.heroImg}
            />
          </picture>
          <p className={styles.floatChip} aria-hidden="true">
            <span />
            {EJ.chip}
          </p>
        </div>
      </div>

      <div className={styles.landing}>
        {/* 2. Cómo funciona */}
        <section className={styles.section} aria-labelledby="ws-como">
          <header className={styles.head}>
            <NumberedLabel>Cómo funciona</NumberedLabel>
            <Heading level={2} id="ws-como">
              Tres pasos, unos segundos.
            </Heading>
          </header>
          <ol className={styles.pasos}>
            {PASOS.map((p, i) => (
              <li key={p.titulo} className={styles.card}>
                <span className={styles.cardTop}>
                  <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                  <Icon name={p.icon} size={24} />
                </span>
                <h3 className={styles.cardTitle}>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. Lo que recibes */}
        <Suspense fallback={<Recibes vino={null} />}>
          <RecibesConVino />
        </Suspense>

        {/* 4. Cuándo usarlo */}
        <section className={styles.section} aria-labelledby="ws-usos">
          <header className={styles.head}>
            <NumberedLabel>Úsalo cuando…</NumberedLabel>
            <Heading level={2} id="ws-usos">
              Tienes una botella enfrente.
            </Heading>
          </header>
          <ul className={styles.grid4}>
            {USOS.map((u) => (
              <li key={u.titulo} className={styles.card}>
                <Icon name={u.icon} size={24} />
                <h3 className={styles.cardTitle}>{u.titulo}</h3>
                <p>{u.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 5 y 6. Tips y confianza, en la misma banda */}
        <div className={styles.band}>
          <section className={styles.bandInner} aria-labelledby="ws-tips">
            <NumberedLabel>Para un mejor resultado</NumberedLabel>
            <h2 id="ws-tips" className="vv-sr-only">
              Tips para una buena foto
            </h2>
            <ul className={styles.tips}>
              {TIPS.map((t) => (
                <li key={t.texto}>
                  <span className={styles.tipIcon}>
                    <Icon name={t.icon} size={22} />
                  </span>
                  {t.texto}
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.bandInner} aria-labelledby="ws-confianza">
            <h2 id="ws-confianza" className="vv-sr-only">
              Lo que debes saber
            </h2>
            <ul className={styles.trust}>
              {CONFIANZA.map((c) => (
                <li key={c.texto}>
                  <Icon name={c.icon} size={20} />
                  {c.texto}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 7. Preguntas frecuentes */}
        <section className={styles.section} aria-labelledby="ws-faq">
          <div className={styles.faqLayout}>
            <header className={styles.head}>
              <NumberedLabel>Preguntas frecuentes</NumberedLabel>
              <Heading level={2} id="ws-faq">
                Lo que suelen preguntarnos.
              </Heading>
            </header>
            <div className={styles.faq}>
              {PREGUNTAS.map((p) => (
                <details key={p.q}>
                  <summary>
                    <h3>{p.q}</h3>
                  </summary>
                  <p>{p.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Cierre */}
        <section className={`${styles.section} ${styles.final}`} aria-labelledby="ws-cierre" id="ws-final">
          <div className={styles.finalBox}>
            <Heading level={2} id="ws-cierre">
              Tu próxima botella, sin adivinar.
            </Heading>
            <div className={styles.mobile}>
              <BotonEscanear />
            </div>
            <div className={styles.desktop}>
              <QrCard titleId="qr-title-final" nivel={3} />
            </div>
            <ButtonLink href="/arma-tu-kit" variant="link">
              ¿Prefieres elegir ya? Arma tu kit
            </ButtonLink>
            <p className={styles.fine}>Disfruta con moderación. Este contenido es solo para mayores de edad.</p>
          </div>
        </section>

        <div className={styles.mobile}>
          <BarraEscanear />
        </div>
      </div>
    </div>
  );
}
