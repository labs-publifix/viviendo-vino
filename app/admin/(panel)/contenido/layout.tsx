import type { ReactNode } from "react";
import { CONTENIDO_TABS } from "@/lib/admin/rules";
import { PageHead } from "../_ui/PageHead";
import { Tabs } from "../_ui/Tabs";

// Contenido: los tres frentes del sitio que se administran aquí (quiz, Wine Scan y blog).
export default function ContenidoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHead title="Contenido" text="Cómo usa la gente el Quiz IA y el Wine Scan, y en qué va cada pieza del blog." />
      <Tabs label="Frentes de contenido" items={CONTENIDO_TABS} />
      {children}
    </>
  );
}
