import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "./../_ui/PageHead";
import styles from "./../_ui/panel.module.css";

export const metadata: Metadata = { title: "Configuración" };

export default async function Page() {
  await requireAdmin(["admin", "aliado", "atencion"]);
  return (
    <>
      <PageHead title="Configuración" />
      <div className={`${styles.card} ${styles.soon}`}>
        <p className={styles.mono}>En construcción</p>
        <p>Equipo y roles, datos del aliado y Mi cuenta (contraseña y código en dos pasos) llegan el miércoles 28.</p>
      </div>
    </>
  );
}
