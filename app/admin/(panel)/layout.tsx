import type { ReactNode } from "react";
import { Suspense } from "react";
import { ROL_LABEL, SECCIONES } from "@/lib/admin/rules";
import { requireAdmin } from "@/lib/admin/session";
import { Nav } from "./_ui/Nav";
import styles from "./_ui/panel.module.css";

// Estructura del panel: menú lateral según el rol y el contenido de cada sección. La sesión se lee dentro de
// <Suspense> (Cache Components); cada página y cada acción vuelve a revisarla.

async function Sidebar() {
  const user = await requireAdmin();
  const items = SECCIONES.filter((s) => s.roles.includes(user.rol)).map(({ href, label }) => ({ href, label }));
  return <Nav items={items} nombre={user.nombre} rol={ROL_LABEL[user.rol]} />;
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Suspense fallback={<div className={styles.navSkeleton} aria-hidden="true" />}>
        <Sidebar />
      </Suspense>
      <main className={styles.main}>
        <Suspense fallback={<p className={styles.loading}>Cargando…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
