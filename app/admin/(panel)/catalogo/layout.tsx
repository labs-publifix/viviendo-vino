import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Tabs } from "../_ui/Tabs";

// Catálogo. Admin: vinos, kits prearmados y grupos. Aliado: solo sus vinos, para marcarlos disponibles o agotados.
export default async function CatalogoLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin(["admin", "aliado"]);
  if (user.rol === "aliado") {
    return (
      <>
        <PageHead title="Tus vinos" text="Marca cuáles tienes disponibles. Un vino agotado se sigue viendo en la tienda, pero nadie lo puede agregar a su kit." />
        {children}
      </>
    );
  }
  return (
    <>
      <PageHead title="Catálogo" text="Los vinos, kits prearmados y grupos de cada aliado. Lo que guardes aquí se ve en la tienda al momento." />
      <Tabs
        label="Secciones del Catálogo"
        items={[
          { href: "/admin/catalogo/vinos", label: "Vinos" },
          { href: "/admin/catalogo/kits", label: "Kits prearmados" },
          { href: "/admin/catalogo/grupos", label: "Grupos" },
        ]}
      />
      {children}
    </>
  );
}
