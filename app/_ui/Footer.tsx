import Link from "next/link";
import { SocialLinks } from "./SocialLinks";
import styles from "./Footer.module.css";

// Pie (Manual · 10.11): enlaces, aviso +18 y consumo responsable. Sin muros: el aviso solo informa.
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo */}
          <img src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
          <p>Kits de 6 botellas de vino italiano. Envío incluido.</p>
          <SocialLinks />
        </div>
        <nav aria-label="Información">
          <ul className={styles.links}>
            <li><Link href="/envios">Envíos</Link></li>
            <li><Link href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
            <li><Link href="/terminos">Términos y condiciones</Link></li>
            <li><Link href="/privacidad">Aviso de privacidad</Link></li>
          </ul>
        </nav>
      </div>
      <div className={styles.legal}>
        <p className={styles.age}>Venta solo a mayores de 18 años</p>
        {/* Leyenda pendiente de validación legal (PENDIENTES.md). */}
        <p>Evita el exceso. © 2026 Viviendo Vino · Tienda en línea.</p>
      </div>
    </footer>
  );
}
