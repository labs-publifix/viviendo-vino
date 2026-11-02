import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Tabs } from "../_ui/Tabs";

// Catálogo. Admin: vinos, kits prearmados y grupos. Aliado: sus vinos, para llevar el inventario. Atención: los
// vinos, para consultar el inventario.
export default async function CatalogoLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin(["admin", "aliado", "atencion"]);
  if (user.rol === "aliado") {
    return (
      <>
        <PageHead title="Tus vinos" text="Cuántas botellas tienes de cada vino. Cuando llega a 0, en la tienda aparece agotado y nadie lo puede agregar a su kit." />
        {children}
      </>
    );
  }
  if (user.rol === "atencion") {
    return (
      <>
        <PageHead title="Vinos" text="Cuántas botellas hay de cada vino y cuáles están por agotarse." />
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
