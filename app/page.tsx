import { Countdown } from "@/app/_waitlist/Countdown";
import { SignupForm } from "@/app/_waitlist/SignupForm";
import styles from "@/app/_waitlist/waitlist.module.css";

// Home temporal: lista de espera con cuenta regresiva hasta la apertura de la tienda.
export default function Home() {
  return (
    <div className={`${styles.page} vv-theme-auto`}>
      <main className={styles.main}>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo, sin optimizar */}
        <img className={`${styles.logo} ${styles.logoLight}`} src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${styles.logo} ${styles.logoDark}`} src="/brand/logo-fondo-oscuro.svg" alt="Viviendo Vino" width={786} height={250} />

        <hr className={styles.rule} />
        <p className={styles.eyebrow}>Próximamente</p>
        <h1 className={styles.title}>Apúntate y recibe un regalo sorpresa con tu primer kit.</h1>

        <Countdown />

        <ol className={styles.steps} aria-label="Cómo funciona">
          <li><span className={styles.stepNum}>01</span><span>Apúntate con tu correo.</span></li>
          <li><span className={styles.stepNum}>02</span><span>Compra tu kit en las primeras 48 horas después de la apertura.</span></li>
          <li><span className={styles.stepNum}>03</span><span>Recibe tu regalo sorpresa con tu pedido.</span></li>
        </ol>

        <SignupForm />
      </main>

      <footer className={styles.footer}>© 2026 Viviendo Vino · Consumo exclusivo para mayores de edad.</footer>
    </div>
  );
}
