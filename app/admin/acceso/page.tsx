import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeAdminNext } from "@/lib/admin/rules";
import { getAdmin } from "@/lib/admin/session";
import { LoginForm } from "./LoginForm";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  contrasena: "Tu contraseña quedó guardada. Ya puedes entrar.",
  salida: "Cerraste sesión.",
};

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeAdminNext(sp.next) : undefined;
  // Con sesión abierta no tiene caso volver a entrar.
  if (await getAdmin()) redirect(next ?? "/admin");
  const aviso = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;
  return <LoginForm next={next} aviso={aviso} />;
}

export default function AccesoPage({ searchParams }: PageProps<"/admin/acceso">) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
        <img src="/brand/logo-color.svg" alt="Viviendo Vino" className={styles.logo} width={786} height={250} />
        <div className={styles.head}>
          <p className={styles.label}>Panel de administración</p>
          <h1 className={styles.title}>Entra al panel.</h1>
        </div>
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
