import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { Soon } from "../../_ui/Soon";

export const metadata: Metadata = { title: "Wine Scan · Contenido" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <Soon
      when="jueves 29"
      items={[
        "Cuántas etiquetas se escanean por día",
        "Los vinos que más se escanean",
        "Cuántas veces la respuesta sirvió y cuántas no",
      ]}
    />
  );
}
