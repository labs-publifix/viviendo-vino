import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Soon } from "../_ui/Soon";

export const metadata: Metadata = { title: "Catálogo" };

export default async function Page() {
  await requireAdmin(["admin", "aliado"]);
  return (
    <>
      <PageHead title="Catálogo" text="Aliados, sus vinos y los kits prearmados de la tienda." />
      <Soon
        when="martes 27"
        items={[
          "Dar de alta aliados y sus grupos de botellas",
          "Editar precio, foto y textos de cada vino",
          "Marcar un vino como disponible o agotado",
          "Armar y editar los kits prearmados",
        ]}
        note="Trabaja sobre los 19 vinos que ya están cargados: no se borra ni se vuelve a cargar nada."
      />
    </>
  );
}
