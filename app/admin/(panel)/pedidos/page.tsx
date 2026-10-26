import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "./../_ui/PageHead";
import styles from "./../_ui/panel.module.css";

export const metadata: Metadata = { title: "Pedidos" };

export default async function Page() {
  await requireAdmin(["admin", "aliado", "atencion"]);
  return (
    <>
      <PageHead title="Pedidos" />
      <div className={`${styles.card} ${styles.soon}`}>
        <p className={styles.mono}>En construcción</p>
        <p>La bandeja de pedidos llega el viernes 30, con su modelo de datos; los pedidos reales empiezan a llegar al conectar el checkout y Mercado Pago.</p>
      </div>
    </>
  );
}
