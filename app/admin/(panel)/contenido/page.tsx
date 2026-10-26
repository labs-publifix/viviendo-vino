import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "./../_ui/PageHead";
import styles from "./../_ui/panel.module.css";

export const metadata: Metadata = { title: "Contenido" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHead title="Contenido" />
      <div className={`${styles.card} ${styles.soon}`}>
        <p className={styles.mono}>En construcción</p>
        <p>La marquesina programable llega el miércoles 28.</p>
      </div>
    </>
  );
}
