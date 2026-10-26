import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { Soon } from "../../_ui/Soon";

export const metadata: Metadata = { title: "Quiz IA · Contenido" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <Soon
      when="jueves 29"
      items={[
        "Cuántas personas empiezan y terminan el quiz",
        "Los perfiles que más salen",
        "Cuántas agregan su kit al carrito",
        "Los correos guardados y las guías pedidas desde el resultado",
      ]}
    />
  );
}
