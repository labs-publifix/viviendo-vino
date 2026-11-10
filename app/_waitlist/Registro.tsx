"use client";

import { SOCIAL } from "@/lib/social";
import { launch, phaseAt, signupClose } from "@/lib/launch";
import { Countdown } from "./Countdown";
import { useAhora, type Simulacion } from "./reloj";
import { SignupForm } from "./SignupForm";
import styles from "./landing.module.css";

const instagram = SOCIAL.find((s) => s.id === "instagram")!;

// Bloque principal del hero: título, formulario y cuenta regresiva. El correo va arriba para que en el celular se vea
// en la primera pantalla. Hasta el lunes 16 a las 11:59 pm la lista acepta registros; después el formulario se cierra
// solo y la cuenta va a la apertura (el servidor también rechaza).
export function Registro({ simular = null }: { simular?: Simulacion }) {
  const now = useAhora(simular);
  const fase = now === null ? "registro" : phaseAt(now);
  const abierta = fase === "registro";

  return (
    <div className={styles.registro} id="registro">
      <p className={styles.eyebrow}>Tienda en línea · Abre el {launch.day}</p>
      <h1 className={styles.title}>{abierta ? "Déjanos tu correo y llévate un descorchador Viviendo Vino." : "La lista de espera cerró. Nos vemos el jueves."}</h1>
      <p className={styles.lede}>
        {abierta
          ? "Va de regalo con tu primer kit de 6 botellas de vino italiano. Solo para la lista de espera."
          : "Kits de 6 botellas de vino italiano que tú armas, con envío incluido."}
      </p>
      {abierta ? (
        <>
          <SignupForm />
          <Countdown now={now} abierta />
        </>
      ) : (
        <>
          <Countdown now={now} abierta={false} />
          <div className={styles.cerrada} role="status">
            <p>
              La lista cerró el {signupClose.day} a las {signupClose.time}. Si te registraste, compra con el mismo correo entre el {launch.day} y las 48
              horas siguientes para recibir tu descorchador.
            </p>
            <a href={instagram.href} target="_blank" rel="noopener noreferrer" className={styles.cerradaLink}>
              Síguenos en Instagram {instagram.handle}
              <span className="vv-sr-only"> (se abre en otra pestaña)</span>
            </a>
          </div>
        </>
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
