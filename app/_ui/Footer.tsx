import Link from "next/link";
import { CONTACTO } from "@/lib/contacto";
import { SOCIAL } from "@/lib/social";
import { Anio } from "./Anio";
import { ButtonLink } from "./Button";
import { ContactoDatos } from "./ContactoDatos";
import { Icon } from "./Icon";
import styles from "./Footer.module.css";

// Pie (Manual · 10.11). Arriba, cuatro columnas iguales: marca, Descubrir, Información y Servicios. Debajo, la franja
// de Contacto con sus cuatro datos alineados a esas mismas columnas. Al final: derechos, tarjetas aceptadas y consumo
// responsable. Tableta: marca arriba, tres columnas y contacto en 2 × 2. Móvil: marca, contacto (siempre visible) y
// las tres columnas de enlaces como acordeones cerrados.

type Columna = { id: string; titulo: string; enlaces: { href: string; texto: string }[]; nota?: string };

const COLUMNAS: Columna[] = [
  {
    id: "descubrir",
    titulo: "Descubrir",
    enlaces: [
      { href: "/wine-scan", texto: "Wine Scan" },
      { href: "/quiz", texto: "Quiz IA" },
      { href: "/blog", texto: "Blog" },
      { href: "/nosotros", texto: "Nosotros" },
    ],
  },
  {
    id: "informacion",
    titulo: "Información",
    enlaces: [
      { href: "/envios", texto: "Información de envíos" },
      { href: "/preguntas-frecuentes", texto: "Preguntas frecuentes" },
      { href: "/terminos", texto: "Términos y condiciones" },
      { href: "/privacidad", texto: "Aviso de privacidad" },
    ],
  },
  {
    id: "servicios",
    titulo: "Servicios",
    enlaces: [
      { href: "/servicios#marketing", texto: "Marketing para negocios de vino" },
      { href: "/servicios#ia", texto: "Experiencias con IA" },
      { href: "/servicios#consultoria", texto: "Consultoría para centros de consumo" },
      { href: "/servicios#regalos", texto: "Regalos corporativos" },
    ],
    nota: "En alianza con Continental Media",
  },
];

const TARJETAS = [
  { src: "/img/pagos/visa.png", alt: "Visa", w: 198, h: 64, alto: 20 },
  { src: "/img/pagos/mastercard.png", alt: "Mastercard", w: 82, h: 64, alto: 26 },
  { src: "/img/pagos/amex.png", alt: "American Express", w: 64, h: 64, alto: 26 },
];

const instagram = SOCIAL.find((s) => s.id === "instagram")!;
const otrasRedes = SOCIAL.filter((s) => s.id !== "instagram");

function Enlaces({ col }: { col: Columna }) {
  return (
    <>
      <ul className={styles.links}>
        {col.enlaces.map((e) => (
          <li key={e.href}>
            <Link href={e.href}>{e.texto}</Link>
          </li>
        ))}
      </ul>
      {col.nota && <p className={styles.nota}>{col.nota}</p>}
    </>
  );
}

export function Footer() {
  const legal = [CONTACTO.razonSocial, CONTACTO.rfc && `RFC ${CONTACTO.rfc}`].filter(Boolean).join(" · ");
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo */}
          <img src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
          <p>Kits de 6 botellas de vino italiano. Envío incluido.</p>
          <a href={instagram.href} target="_blank" rel="noopener noreferrer" className={styles.instagram}>
            <Icon name="instagram" size={22} />
            {instagram.handle}
            <span className="vv-sr-only"> en Instagram (se abre en otra pestaña)</span>
          </a>
          <ul className={styles.redes} aria-label="Otras redes de Viviendo Vino">
            {otrasRedes.map((s) => (
              <li key={s.id}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} (se abre en otra pestaña)`}>
                  <Icon name={s.id} size={20} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Escritorio y tableta: columnas abiertas. */}
        {COLUMNAS.map((col) => (
          <nav key={col.id} className={`${styles.col} ${styles.abierta}`} aria-labelledby={`pie-${col.id}`}>
            <h2 id={`pie-${col.id}`} className={styles.colTitle}>
              {col.titulo}
            </h2>
            <Enlaces col={col} />
          </nav>
        ))}

        <section className={styles.contacto} aria-labelledby="pie-contacto">
          <div className={styles.contactoHead}>
            <h2 id="pie-contacto" className={styles.colTitle}>
              Contacto
            </h2>
            <ButtonLink href="/contacto" variant="secondary" className={styles.escribenos}>
              <Icon name="mail" size={18} />
              Escríbenos
            </ButtonLink>
          </div>
          <ContactoDatos variante="franja" />
        </section>

        {/* Móvil: las mismas columnas como acordeones cerrados (details/summary, operables con teclado). */}
        <div className={styles.acordeones}>
          {COLUMNAS.map((col) => (
            <details key={col.id} className={styles.acordeon}>
              <summary>
                <h2 className={styles.colTitle}>{col.titulo}</h2>
                <Icon name="chevron" size={18} />
              </summary>
              <nav aria-label={col.titulo}>
                <Enlaces col={col} />
              </nav>
            </details>
          ))}
        </div>
      </div>

      <div className={styles.franja}>
        <p className={styles.derechos}>
          © <Anio /> Viviendo Vino. Todos los derechos reservados.
          {legal && <span className={styles.razon}>{legal}</span>}
        </p>
        <div className={styles.tarjetas}>
          <p>Aquí tus tarjetas son bienvenidas</p>
          <ul aria-label="Tarjetas aceptadas">
            {TARJETAS.map((t) => (
              <li key={t.alt}>
                {/* eslint-disable-next-line @next/next/no-img-element -- PNG pequeño a 2x, sin optimizador */}
                <img src={t.src} alt={t.alt} width={t.w} height={t.h} style={{ height: t.alto, width: "auto" }} loading="lazy" />
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.moderacion}>Disfruta con moderación. Este contenido es solo para mayores de edad.</p>
      </div>
    </footer>
  );
}
