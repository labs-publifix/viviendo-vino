import { SOCIAL } from "@/lib/social";
import { giftEnd, launch, signupClose } from "@/lib/launch";
import { CtaRegistro, Registro } from "./Registro";
import type { Simulacion } from "./reloj";
import styles from "./landing.module.css";

// Landing de la lista de espera (www.viviendovino.com mientras la tienda está cerrada). Simple a propósito (10 nov
// 2026): lo único que hay que hacer es dejar el correo; el regalo es un descorchador Viviendo Vino. Sin enlaces a la
// tienda ni precios. Sus imágenes viven en /img/lista/, la única carpeta de imágenes que el gate deja pasar.

const instagram = SOCIAL.find((s) => s.id === "instagram")!;

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
            <img src="/img/lista/descorchador.webp" alt="Descorchador negro con el logotipo de Viviendo Vino, sobre una mesa junto a una copa de vino tinto" width={900} height={900} fetchPriority="high" />
          </div>
        </div>

        {/* 2. El regalo: descorchador */}
        <section className={styles.regalo} aria-labelledby="lista-regalo">
          <div className={styles.regaloInner}>
            <header className={styles.sectionHead}>
              <p className={styles.eyebrowDark}>Lista de espera</p>
              <h2 id="lista-regalo" className={styles.sectionTitleDark}>
                Tu descorchador en tres pasos.
              </h2>
            </header>
            <ol className={styles.pasos}>
              <li>
                <span className={styles.pasoNum}>01</span>
                <span className={styles.pasoTitulo}>Apúntate</span>
                <span>
                  Deja tu correo antes del {signupClose.day} a las {signupClose.time}. Te llega al instante nuestra Guía de maridaje en PDF.
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
                <span className={styles.pasoTitulo}>Recibe tu descorchador</span>
                <span>Un descorchador Viviendo Vino llega con tu primer kit. Uno por persona.</span>
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
