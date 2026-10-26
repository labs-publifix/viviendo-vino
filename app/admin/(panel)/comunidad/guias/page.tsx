import type { Metadata } from "next";
import { getGuiasPedidas } from "@/lib/admin/comunidad";
import { requireAdmin } from "@/lib/admin/session";
import { DataTable } from "../../_ui/DataTable";
import { ListHead } from "../../_ui/ListHead";

export const metadata: Metadata = { title: "Guías pedidas · Comunidad" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const rows = await getGuiasPedidas();
  return (
    <>
      <ListHead
        text="Guías en PDF que se pidieron por correo desde el blog. Novedades indica si aceptaron recibir correos de la tienda."
        exportHref="/admin/comunidad/exportar?lista=guias"
      />
      <DataTable
        rows={rows}
        columns={[
          { key: "email", label: "Correo", kind: "email", primary: true },
          { key: "guia", label: "Guía" },
          { key: "novedades", label: "Novedades", kind: "bool" },
          { key: "enviado", label: "Correo enviado", kind: "bool" },
          { key: "fecha", label: "Fecha", kind: "fecha" },
        ]}
        searchKeys={["email", "guia"]}
        searchLabel="Buscar por correo o guía"
        noun={["solicitud", "solicitudes"]}
        empty="Nadie ha pedido una guía todavía. Las solicitudes del blog aparecen aquí al momento."
      />
    </>
  );
}
