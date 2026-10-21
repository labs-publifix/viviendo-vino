import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "@/app/_waitlist/waitlist.module.css";
import { Unsubscribe } from "./Unsubscribe";

export const metadata: Metadata = {
  title: "Darme de baja · Viviendo Vino",
  robots: { index: false },
};

export default function BajaPage() {
  return (
    <div className={`${styles.page} vv-theme-auto`}>
      <main className={styles.main}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${styles.logo} ${styles.logoLight}`} src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${styles.logo} ${styles.logoDark}`} src="/brand/logo-fondo-oscuro.svg" alt="Viviendo Vino" width={786} height={250} />
        <hr className={styles.rule} />
        <Suspense>
          <Unsubscribe />
        </Suspense>
      </main>
    </div>
  );
}
