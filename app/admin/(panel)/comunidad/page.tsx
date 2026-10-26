import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Soon } from "../_ui/Soon";

export const metadata: Metadata = { title: "Comunidad" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHead title="Comunidad" text="Las personas que dejaron su correo en el sitio." />
      <Soon
        when="jueves 29"
        items={[
          "Ver la lista de espera",
          "Ver los correos guardados desde el quiz y las guías pedidas",
          "Revisar los permisos que dio cada persona",
          "Exportar a CSV",
        ]}
      />
    </>
  );
}
