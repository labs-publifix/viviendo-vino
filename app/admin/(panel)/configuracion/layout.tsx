import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Tabs } from "../_ui/Tabs";

// Configuración: Mi cuenta (todas las personas) y Equipo (solo admin). Los datos del aliado se editan en
// Catálogo, junto con sus vinos.
export default async function ConfiguracionLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  const tabs = [{ href: "/admin/configuracion/cuenta", label: "Mi cuenta" }];
  if (user.rol === "admin") tabs.push({ href: "/admin/configuracion/equipo", label: "Equipo" });
  return (
    <>
      <PageHead title="Configuración" text={user.rol === "admin" ? "Tu cuenta y las personas que entran al panel." : "Tu cuenta del panel."} />
      <Tabs label="Secciones de Configuración" items={tabs} />
      {children}
    </>
  );
}
