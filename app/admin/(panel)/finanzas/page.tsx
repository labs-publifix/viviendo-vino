import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "./../_ui/PageHead";
import styles from "./../_ui/panel.module.css";

export const metadata: Metadata = { title: "Finanzas" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHead title="Finanzas" />
      <div className={`${styles.card} ${styles.soon}`}>
        <p className={styles.mono}>En construcción</p>
        <p>El libro de liquidaciones y las transferencias al aliado llegan el viernes 30.</p>
      </div>
    </>
  );
}
