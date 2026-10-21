import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessForm } from "./AccessForm";
import styles from "./acceso.module.css";

export const metadata: Metadata = {
  title: "Vista previa privada · Viviendo Vino",
  robots: { index: false, follow: false },
};

export default function AccesoPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo */}
        <img className={styles.logo} src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
        <h1 className={styles.title}>Vista previa privada.</h1>
        <p className={styles.lede}>Es la tienda en construcción. Escribe la contraseña que te compartió el equipo.</p>
        <Suspense>
          <AccessForm />
        </Suspense>
      </main>
    </div>
  );
}
