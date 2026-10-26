import type { Metadata } from "next";
import { getQuizGuardados } from "@/lib/admin/comunidad";
import { requireAdmin } from "@/lib/admin/session";
import { DataTable } from "../../_ui/DataTable";
import { ListHead } from "../../_ui/ListHead";

export const metadata: Metadata = { title: "Quiz IA · Comunidad" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const rows = await getQuizGuardados();
  return (
    <>
      <ListHead
        text="Quienes pidieron su resultado del quiz por correo. Novedades indica si aceptaron recibir correos de la tienda."
        exportHref="/admin/comunidad/exportar?lista=quiz"
      />
      <DataTable
        rows={rows}
        columns={[
          { key: "email", label: "Correo", kind: "email", primary: true },
          { key: "perfil", label: "Perfil" },
          { key: "novedades", label: "Novedades", kind: "bool" },
          { key: "enviado", label: "Correo enviado", kind: "bool" },
          { key: "fecha", label: "Fecha", kind: "fecha" },
        ]}
        searchKeys={["email", "perfil"]}
        searchLabel="Buscar por correo o perfil"
        noun={["correo", "correos"]}
        empty="Nadie ha guardado su resultado del quiz todavía."
      />
    </>
  );
}
