import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "./../_ui/PageHead";
import styles from "./../_ui/panel.module.css";

export const metadata: Metadata = { title: "Quiz IA y Wine Scan" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHead title="Quiz IA y Wine Scan" />
      <div className={`${styles.card} ${styles.soon}`}>
        <p className={styles.mono}>En construcción</p>
        <p>Las métricas de las dos funciones llegan el jueves 29.</p>
      </div>
    </>
  );
}
