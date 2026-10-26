import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { Soon } from "../../_ui/Soon";

export const metadata: Metadata = { title: "Blog y guías · Contenido" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <Soon
      when="jueves 29"
      items={[
        "Ver los artículos y guías publicados",
        "Cuántas guías en PDF se descargan o se piden por correo",
      ]}
      note="Los textos del blog se siguen escribiendo y aprobando como hasta ahora; aquí se ven publicados y su respuesta."
    />
  );
}
