import type { ReactNode } from "react";
import { CONTENIDO_TABS } from "@/lib/admin/rules";
import { PageHead } from "../_ui/PageHead";
import { Tabs } from "../_ui/Tabs";

// Contenido: los tres frentes del sitio que se administran aquí (quiz, Wine Scan y blog).
export default function ContenidoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHead title="Contenido" text="Quiz IA, Wine Scan y blog: cómo los usa la gente y qué hay publicado." />
      <Tabs label="Frentes de contenido" items={CONTENIDO_TABS} />
      {children}
    </>
  );
}
