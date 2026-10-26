import type { Metadata } from "next";
import { RecoverForm } from "./RecoverForm";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Crear contraseña" };

export default function RecuperarPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
        <img src="/brand/logo-color.svg" alt="Viviendo Vino" className={styles.logo} width={786} height={250} />
        <div className={styles.head}>
          <p className={styles.label}>Panel de administración</p>
          <h1 className={styles.title}>Crea tu contraseña.</h1>
          <p className={styles.text}>Escribe el correo con el que tienes acceso. Te enviamos un enlace para crearla; sirve también si la olvidaste.</p>
        </div>
        <RecoverForm />
      </div>
    </main>
  );
}
