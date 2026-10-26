import type { ReactNode } from "react";
import { getResumen } from "@/lib/admin/comunidad";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Tabs } from "../_ui/Tabs";
import styles from "../_ui/panel.module.css";

// Comunidad: las personas que dejaron su correo en el sitio. Solo admin.
export default async function ComunidadLayout({ children }: { children: ReactNode }) {
  await requireAdmin(["admin"]);
  const r = await getResumen();
  const n = (v: number) => v.toLocaleString("es-MX");
  return (
    <>
      <PageHead title="Comunidad" text="Las personas que dejaron su correo en el sitio y lo que pidieron." />
      <dl className={styles.stats}>
        <div>
          <dt>En la lista de espera</dt>
          <dd>{n(r.activas)}</dd>
        </div>
        <div>
          <dt>Nuevas en 7 días</dt>
          <dd>{n(r.nuevas)}</dd>
        </div>
        <div>
          <dt>Correos desde el quiz</dt>
          <dd>{n(r.quiz)}</dd>
        </div>
        <div>
          <dt>Guías pedidas</dt>
          <dd>{n(r.guias)}</dd>
        </div>
      </dl>
      <Tabs
        label="Listas de Comunidad"
        items={[
          { href: "/admin/comunidad/lista-de-espera", label: "Lista de espera" },
          { href: "/admin/comunidad/quiz", label: "Quiz IA" },
          { href: "/admin/comunidad/guias", label: "Guías pedidas" },
        ]}
      />
      {children}
    </>
  );
}
