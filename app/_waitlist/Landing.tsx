import { PERFILES } from "@/lib/quiz/config";
import { SOCIAL } from "@/lib/social";
import { giftEnd, launch, signupClose } from "@/lib/launch";
import { CtaRegistro, Registro } from "./Registro";
import type { Simulacion } from "./reloj";
import styles from "./landing.module.css";

// Landing de la lista de espera (www.viviendovino.com mientras la tienda está cerrada). Cuenta lo que trae la tienda:
// kits de 6, Wine Scan, Quiz IA y el blog con guías. Sin enlaces a la tienda (en producción aún no existe) y sin
// precios. Sus imágenes viven en /img/lista/, la única carpeta de imágenes que el gate deja pasar antes de abrir.

const instagram = SOCIAL.find((s) => s.id === "instagram")!;

const GUIAS = [
  { titulo: "Guía de maridaje", nota: "Cómo combinar vino y comida sin reglas rígidas", regalo: true },
  { titulo: "Temperatura de servicio", nota: "A qué temperatura servir cada vino" },
  { titulo: "Tu perfil de vino", nota: "Una guía para cada perfil del Quiz IA" },
];

function Seccion({ n, etiqueta, titulo, children, visual, invertida }: { n: string; etiqueta: string; titulo: string; children: React.ReactNode; visual: React.ReactNode; invertida?: boolean }) {
  return (
    <section className={`${styles.feature} ${invertida ? styles.invertida : ""}`} aria-labelledby={`lista-${n}`}>
      <div className={styles.featureText}>
        <p className={styles.featureLabel}>
          <span>{n}</span> {etiqueta}
        </p>
        <h3 id={`lista-${n}`} className={styles.featureTitle}>
          {titulo}
        </h3>
        {children}
      </div>
      <div className={styles.featureVisual}>{visual}</div>
    </section>
  );
}

export function Landing({ simular = null }: { simular?: Simulacion }) {
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo */}
        <img className={styles.logo} src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
        <a href={instagram.href} target="_blank" rel="noopener noreferrer" className={styles.topLink}>
          {instagram.handle}
          <span className="vv-sr-only"> en Instagram (se abre en otra pestaña)</span>
        </a>
      </header>

      <main>
        {/* 1. Hero: registro y cuenta regresiva */}
        <div className={styles.hero}>
          <Registro simular={simular} />
          <div className={styles.heroMedia}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ilustración ya optimizada */}
            <img src="/img/lista/hero.webp" alt="Ilustración de un hombre en una terraza probando una copa de vino blanco" width={720} height={960} fetchPriority="high" />
          </div>
        </div>

        {/* 2. Lo que vas a encontrar */}
        <section className={styles.features} aria-labelledby="lista-encontrar">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Lo que vas a encontrar</p>
            <h2 id="lista-encontrar" className={styles.sectionTitle}>
              Una tienda de vino, y mucho más.
            </h2>
          </header>

          <Seccion
            n="01"
            etiqueta="Kits de 6"
            titulo="Kits de 6 botellas que tú armas."
            visual={
              // eslint-disable-next-line @next/next/no-img-element -- foto ya optimizada
              <img src="/img/lista/kit.webp" alt="Seis botellas de vino blanco italiano en fila" width={880} height={660} loading="lazy" className={styles.photo} />
            }
          >
            <p>Eliges 6 botellas de un mismo grupo y las combinas como quieras: repite tu favorita o mezcla. Te lo enviamos a tu domicilio con el envío incluido.</p>
            <ul className={styles.ticks}>
              <li>Vino italiano de importadores aliados</li>
              <li>Envío incluido en el precio</li>
              <li>Kits listos si no quieres armarlo</li>
            </ul>
          </Seccion>

          <Seccion
            n="02"
            etiqueta="Wine Scan"
            titulo="Escanea cualquier etiqueta."
            invertida
            visual={
              <div className={styles.scanVisual}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ilustración ya optimizada */}
                <img src="/img/lista/wine-scan.webp" alt="Ilustración de un grupo de amigos en una mesa con vino mirando una etiqueta en un celular" width={560} height={700} loading="lazy" className={styles.photo} />
                <p className={styles.floatChip} aria-hidden="true">
                  <span /> Soave · Garganega · 7 a 9 °C
                </p>
              </div>
            }
          >
            <p>
              Toma una foto de la etiqueta de cualquier vino, en cualquier idioma, y recibe su ficha: qué es, cómo se siente, a qué temperatura servirlo y con
              qué combina.
            </p>
            <ul className={styles.ticks}>
              <li>Lee etiquetas en cualquier idioma</li>
              <li>Gratis y sin registro</li>
              <li>Perfecto para el restaurante, la tienda o un regalo</li>
            </ul>
          </Seccion>

          <Seccion
            n="03"
            etiqueta="Quiz IA"
            titulo="Descubre tu perfil de vino."
            visual={
              <div className={styles.quizCard} aria-hidden="true">
                <p className={styles.quizQ}>¿Cuál eres tú?</p>
                <ul>
                  {PERFILES.map((p, i) => (
                    <li key={p.id} className={i === 1 ? styles.quizPick : undefined}>
                      {p.nombre}
                    </li>
                  ))}
                </ul>
                <p className={styles.quizFoot}>Seis perfiles · tu kit recomendado al final</p>
              </div>
            }
          >
            <p>Responde unas preguntas sencillas sobre lo que te gusta (sin tecnicismos) y la inteligencia artificial te recomienda vinos de nuestra tienda para armar tu kit.</p>
            <ul className={styles.ticks}>
              <li>Seis perfiles, del fresco y directo al intenso y con carácter</li>
              <li>Tu recomendación lista para agregar a tu kit</li>
            </ul>
          </Seccion>

          <Seccion
            n="04"
            etiqueta="Blog y guías"
            titulo="Aprende sin complicarte."
            invertida
            visual={
              <ul className={styles.guias} aria-label="Guías descargables">
                {GUIAS.map((g) => (
                  <li key={g.titulo} className={g.regalo ? styles.guiaRegalo : undefined}>
                    <span className={styles.guiaTag}>{g.regalo ? "Tu regalo · PDF" : "PDF"}</span>
                    <span className={styles.guiaTitulo}>{g.titulo}</span>
                    <span className={styles.guiaNota}>{g.nota}</span>
                  </li>
                ))}
              </ul>
            }
          >
            <p>Artículos y guías descargables para elegir, servir y combinar vino: cómo leer una etiqueta, a qué temperatura servir cada vino y cómo maridar con lo que tienes en casa.</p>
            <p className={styles.featureNote}>La Guía de maridaje te llega de regalo al apuntarte.</p>
          </Seccion>
        </section>

        {/* 3. El regalo sorpresa */}
        <section className={styles.regalo} aria-labelledby="lista-regalo">
          <div className={styles.regaloInner}>
            <header className={styles.sectionHead}>
              <p className={styles.eyebrowDark}>Lista de espera</p>
              <h2 id="lista-regalo" className={styles.sectionTitleDark}>
                Tu regalo sorpresa en tres pasos.
              </h2>
            </header>
            <ol className={styles.pasos}>
              <li>
                <span className={styles.pasoNum}>01</span>
                <span className={styles.pasoTitulo}>Apúntate</span>
                <span>
                  Antes del {signupClose.day} a las {signupClose.time}. Te llega al instante tu Guía de maridaje en PDF.
                </span>
              </li>
              <li>
                <span className={styles.pasoNum}>02</span>
                <span className={styles.pasoTitulo}>Compra en las primeras 48 horas</span>
                <span>
                  Del {launch.day}, {launch.time}, al {giftEnd.day}, {giftEnd.time}, con el mismo correo.
                </span>
              </li>
              <li>
                <span className={styles.pasoNum}>03</span>
                <span className={styles.pasoTitulo}>Recibe tu regalo</span>
                <span>Llega con tu primer kit. Un regalo por persona.</span>
              </li>
            </ol>
            <CtaRegistro simular={simular} />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2026 Viviendo Vino · Consumo exclusivo para mayores de edad.</p>
        <p>Disfruta con moderación.</p>
      </footer>
    </div>
  );
}
