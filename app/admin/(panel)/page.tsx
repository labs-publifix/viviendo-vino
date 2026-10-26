import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "./_ui/PageHead";
import styles from "./_ui/panel.module.css";

export const metadata: Metadata = { title: "Inicio" };

export default async function Page() {
  await requireAdmin(["admin", "aliado", "atencion"]);
  return (
    <>
      <PageHead title="Inicio" />
      <div className={`${styles.card} ${styles.soon}`}>
        <p className={styles.mono}>En construcción</p>
        <p>El tablero con ventas, pedidos por preparar, vinos agotados y alertas llega el jueves 29.</p>
      </div>
    </>
  );
}
