import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { NAV_COOKIE, ROL_LABEL, initials, menuFor } from "@/lib/admin/rules";
import { requireAdmin } from "@/lib/admin/session";
import { Nav } from "./_ui/Nav";
import styles from "./_ui/panel.module.css";

// Estructura del panel: menú según el rol y el contenido de cada sección. La sesión se lee dentro de
// <Suspense> (Cache Components); cada página y cada acción vuelve a revisarla.

async function Sidebar() {
  const user = await requireAdmin();
  const collapsed = (await cookies()).get(NAV_COOKIE)?.value === "1";
  return <Nav groups={menuFor(user.rol)} nombre={user.nombre} rol={ROL_LABEL[user.rol]} iniciales={initials(user.nombre)} collapsed={collapsed} />;
}

function Loading() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Cargando">
      <span className={styles.skelTitle} />
      <span className={styles.skelLine} />
      <span className={styles.skelBlock} />
    </div>
  );
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Suspense fallback={<div className={styles.navSkeleton} aria-hidden="true" />}>
        <Sidebar />
      </Suspense>
      <main className={styles.main} id="contenido">
        <div className={styles.content}>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}
