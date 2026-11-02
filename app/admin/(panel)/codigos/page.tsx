import type { Metadata } from "next";
import { ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { getCodigos } from "@/lib/admin/codigos";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { requireAdmin } from "@/lib/admin/session";
import { ESTADO_CODIGO_LABEL, textoValor, type EstadoCodigo } from "@/lib/descuentos/rules";
import { formatMXN } from "@/lib/money";
import { DataTable, type Column } from "../_ui/DataTable";
import { PageHead } from "../_ui/PageHead";
import c from "./codigos.module.css";

export const metadata: Metadata = { title: "Códigos de descuento" };

// Códigos de descuento (solo admin): estado, reglas y resultados de cada campaña.
const TONO: Record<EstadoCodigo, string> = { activo: "ok", programado: "accent", vencido: "muted", agotado: "aviso", pausado: "muted" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const codigos = await getCodigos();
  const columns: Column[] = [
    { key: "codigo", label: "Código", kind: "link", primary: true },
    { key: "valor", label: "Descuento" },
    { key: "estadoLabel", label: "Estado", kind: "estado" },
    { key: "usos", label: "Usos", kind: "num" },
    { key: "vigencia", label: "Vigencia" },
    { key: "descontado", label: "Descontado", kind: "num" },
    { key: "ventas", label: "Ventas", kind: "num" },
    { key: "neto", label: "Margen neto", kind: "num" },
  ];
  return (
    <>
      <PageHead title="Códigos de descuento" text="Códigos para campañas. El descuento sale del margen de Viviendo Vino y nunca baja de lo acordado con el aliado más la comisión de Mercado Pago.">
        <ButtonLink href="/admin/codigos/nuevo">Nuevo código</ButtonLink>
      </PageHead>
      {codigos.length === 0 ? (
        <div className={c.vacio}>
          <Icon name="tag" size={28} />
          <p>Todavía no hay códigos. Mientras no haya uno activo, el checkout no muestra el campo de código.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={codigos.map((x) => {
            const e = x.estado;
            return {
              id: x.id,
              codigo: x.codigo,
              codigoHref: `/admin/codigos/${x.id}`,
              valor: textoValor(x),
              estadoLabel: ESTADO_CODIGO_LABEL[e],
              estado: e,
              tono: TONO[e],
              usos: `${x.pagados}${x.apartados ? ` + ${x.apartados} en pago` : ""}${x.usosMax ? ` de ${x.usosMax}` : ""}`,
              vigencia: x.terminaAt ? `Hasta ${fechaCdmx(x.terminaAt)}` : "Sin fecha de fin",
              descontado: formatMXN(x.descontado),
              ventas: formatMXN(x.ventas),
              neto: formatMXN(x.margenNeto),
              buscar: `${x.codigo} ${x.descripcion}`,
            };
          })}
          searchKeys={["buscar"]}
          searchLabel="Buscar código"
          noun={["código", "códigos"]}
          empty="Ningún código coincide."
        />
      )}
    </>
  );
}
