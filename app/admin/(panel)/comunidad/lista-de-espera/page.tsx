import type { Metadata } from "next";
import { getEspera } from "@/lib/admin/comunidad";
import { requireAdmin } from "@/lib/admin/session";
import { DataTable } from "../../_ui/DataTable";
import { ListHead } from "../../_ui/ListHead";

export const metadata: Metadata = { title: "Lista de espera · Comunidad" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const rows = await getEspera();
  return (
    <>
      <ListHead
        text="Quienes se anotaron para enterarse de la apertura. Correos recibidos cuenta la confirmación y la secuencia de lanzamiento (hasta 6)."
        exportHref="/admin/comunidad/exportar?lista=espera"
      />
      <DataTable
        rows={rows}
        columns={[
          { key: "email", label: "Correo", kind: "email", primary: true },
          { key: "gustos", label: "Le interesa" },
          { key: "origen", label: "Llegó por" },
          { key: "fecha", label: "Se anotó", kind: "fecha" },
          { key: "correos", label: "Correos recibidos", kind: "num" },
          { key: "estadoLabel", label: "Estado", kind: "estado" },
        ]}
        searchKeys={["email", "origen", "gustos"]}
        searchLabel="Buscar por correo u origen"
        filter={{
          key: "estado",
          label: "Filtrar por estado",
          options: [
            { value: "activa", label: "Activas" },
            { value: "compro", label: "Ya compraron" },
            { value: "baja", label: "Se dieron de baja" },
          ],
        }}
        noun={["persona", "personas"]}
        empty="Todavía no hay nadie en la lista de espera. Los registros de viviendovino.com aparecen aquí al momento."
      />
    </>
  );
}
