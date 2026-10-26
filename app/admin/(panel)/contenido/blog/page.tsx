import type { Metadata } from "next";
import { getBlogPanel } from "@/lib/admin/blog";
import { requireAdmin } from "@/lib/admin/session";
import { DataTable } from "../../_ui/DataTable";
import { ListHead } from "../../_ui/ListHead";
import styles from "../../_ui/panel.module.css";

export const metadata: Metadata = { title: "Blog y guías · Contenido" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const { rows, resumen, proxima } = await getBlogPanel();
  return (
    <>
      <dl className={styles.stats}>
        <div>
          <dt>Publicadas o listas</dt>
          <dd>{resumen.publicadas}</dd>
        </div>
        <div>
          <dt>Programadas</dt>
          <dd>{resumen.programadas}</dd>
        </div>
        <div>
          <dt>Por escribir</dt>
          <dd>{resumen.pendientes}</dd>
        </div>
        <div>
          <dt>Atrasadas</dt>
          <dd>{resumen.atrasadas}</dd>
        </div>
      </dl>
      <ListHead
        text={
          proxima
            ? `Siguiente en salir: ${proxima.numero} · ${proxima.titulo}, el ${proxima.fecha}. Cada jueves a las 9:00 sale una pieza. Las lecturas por artículo llegan en una siguiente versión.`
            : "Cada jueves a las 9:00 sale una pieza. Las lecturas por artículo llegan en una siguiente versión."
        }
      />
      <DataTable
        rows={rows}
        columns={[
          { key: "numero", label: "N.º", kind: "num" },
          { key: "titulo", label: "Título", kind: "link", primary: true },
          { key: "tipo", label: "Tipo" },
          { key: "categoria", label: "Categoría" },
          { key: "fecha", label: "Sale", kind: "fecha" },
          { key: "estadoLabel", label: "Estado", kind: "estado" },
        ]}
        searchKeys={["titulo", "categoria", "keyword", "slug"]}
        searchLabel="Buscar por título, tema o palabra clave"
        filter={{
          key: "grupo",
          label: "Filtrar por estado",
          options: [
            { value: "listo", label: "Publicadas" },
            { value: "programado", label: "Programadas" },
            { value: "pendiente", label: "Por escribir" },
          ],
        }}
        noun={["pieza", "piezas"]}
        empty="El backlog está vacío."
      />
    </>
  );
}
