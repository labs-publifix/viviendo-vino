"use client";

import { SOCIAL } from "@/lib/social";
import { launch, phaseAt, signupClose } from "@/lib/launch";
import { Countdown } from "./Countdown";
import { useAhora, type Simulacion } from "./reloj";
import { SignupForm } from "./SignupForm";
import styles from "./landing.module.css";

const instagram = SOCIAL.find((s) => s.id === "instagram")!;

// Bloque principal del hero: título, cuenta regresiva y formulario. Hasta el lunes 16 a las 11:59 pm la lista
// acepta registros; después el formulario se cierra solo y la cuenta va a la apertura (el servidor también rechaza).
export function Registro({ simular = null }: { simular?: Simulacion }) {
  const now = useAhora(simular);
  const fase = now === null ? "registro" : phaseAt(now);
  const abierta = fase === "registro";

  return (
    <div className={styles.registro} id="registro">
      <p className={styles.eyebrow}>Tienda en línea · Abre el {launch.day}</p>
      <h1 className={styles.title}>{abierta ? "Apúntate y recibe un regalo sorpresa con tu primer kit." : "La lista de espera cerró. Nos vemos el jueves."}</h1>
      <p className={styles.lede}>
        Kits de 6 botellas de vino italiano que tú armas, con envío incluido. Y además: Wine Scan, Quiz IA y guías para disfrutar
        mejor cada copa.
      </p>
      <Countdown now={now} abierta={abierta} />
      {abierta ? (
        <>
          <SignupForm />
          <p className={styles.bonus}>
            <span aria-hidden="true">✦</span> Al registrarte te enviamos de regalo nuestra <strong>Guía de maridaje</strong> en PDF.
          </p>
        </>
      ) : (
        <div className={styles.cerrada} role="status">
          <p>
            La lista cerró el {signupClose.day} a las {signupClose.time}. Si te registraste, compra con el mismo correo entre el {launch.day} y las 48
            horas siguientes para recibir tu regalo sorpresa.
          </p>
          <a href={instagram.href} target="_blank" rel="noopener noreferrer" className={styles.cerradaLink}>
            Síguenos en Instagram {instagram.handle}
            <span className="vv-sr-only"> (se abre en otra pestaña)</span>
          </a>
        </div>
      )}
    </div>
  );
}

/** "Apúntate ahora" del final: solo mientras la lista está abierta. */
export function CtaRegistro({ simular = null }: { simular?: Simulacion }) {
  const now = useAhora(simular);
  if (now !== null && phaseAt(now) !== "registro") return null;
  return (
    <a href="#registro" className={styles.cta}>
      Apúntate antes del {signupClose.shortDay}
    </a>
  );
}
