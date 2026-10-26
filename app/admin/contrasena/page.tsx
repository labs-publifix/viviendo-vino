import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "./PasswordForm";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Contraseña nueva", referrer: "no-referrer" };

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = (await searchParams).t;
  return <PasswordForm token={typeof t === "string" ? t : ""} />;
}

export default function ContrasenaPage({ searchParams }: PageProps<"/admin/contrasena">) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
        <img src="/brand/logo-color.svg" alt="Viviendo Vino" className={styles.logo} width={786} height={250} />
        <div className={styles.head}>
          <p className={styles.label}>Panel de administración</p>
          <h1 className={styles.title}>Crea tu contraseña.</h1>
        </div>
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
