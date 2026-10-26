import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Tabs } from "../_ui/Tabs";

// Configuración: Mi cuenta (todas las personas), Equipo y Aliados (solo admin). Los vinos de cada aliado se
// editan en Catálogo.
export default async function ConfiguracionLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  const tabs = [{ href: "/admin/configuracion/cuenta", label: "Mi cuenta" }];
  if (user.rol === "admin") tabs.push({ href: "/admin/configuracion/equipo", label: "Equipo" }, { href: "/admin/configuracion/aliados", label: "Aliados" });
  return (
    <>
      <PageHead title="Configuración" text={user.rol === "admin" ? "Tu cuenta, las personas que entran al panel y los aliados." : "Tu cuenta del panel."} />
      <Tabs label="Secciones de Configuración" items={tabs} />
      {children}
    </>
  );
}
