import type { Metadata } from "next";
import Link from "next/link";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { getPedidos } from "@/lib/admin/pedidos";
import { ESTADO_LABEL, ESTADO_TONO } from "@/lib/admin/pedidos-rules";
import { requireAdmin } from "@/lib/admin/session";
import { formatMXN } from "@/lib/money";
import { DataTable, type Column } from "../_ui/DataTable";
import { PageHead } from "../_ui/PageHead";
import styles from "../_ui/panel.module.css";
import { PruebaButton } from "./PruebaButton";
import s from "./pedidos.module.css";

export const metadata: Metadata = { title: "Pedidos" };

// En qué etapa va cada pedido, para el filtro de la lista.
const ETAPA: Record<string, string> = { pendiente_pago: "pendiente", pagado: "preparar", preparando: "preparar", enviado: "camino", entregado: "entregado", cancelado: "cancelado" };

const ETAPAS = ["preparar", "camino", "entregado", "cancelado", "pendiente"];

export default async function Page({ searchParams }: PageProps<"/admin/pedidos">) {
  const user = await requireAdmin(["admin", "aliado", "atencion"]);
  const etapa = (await searchParams).etapa;
  // Los pagos que nunca llegaron (apartado vencido) no ensucian la lista: se ven solo con ?etapa=vencido.
  const todos = await getPedidos(user);
  const verVencidos = etapa === "vencido";
  const vencidos = todos.filter((p) => p.estado === "vencido").length;
  const pedidos = todos.filter((p) => (p.estado === "vencido") === verVencidos);
  const cuenta = (etapa: string) => pedidos.filter((p) => ETAPA[p.estado] === etapa).length;
  const n = (v: number) => v.toLocaleString("es-MX");
  const variosAliados = user.rol !== "aliado" && new Set(pedidos.map((p) => p.aliadoId)).size > 1;

  const columns: Column[] = [
    { key: "folio", label: "Pedido", kind: "link", primary: true },
    { key: "fecha", label: "Fecha", kind: "fecha" },
    { key: "cliente", label: "Cliente" },
    { key: "ciudad", label: "Destino" },
    ...(variosAliados ? [{ key: "aliado", label: "Aliado" }] : []),
    { key: "kits", label: "Kits", kind: "num" as const },
    { key: "total", label: user.rol === "aliado" ? "Para ti" : "Total", kind: "num" as const },
    { key: "estadoLabel", label: "Estado", kind: "estado" as const },
  ];

  return (
    <>
      <PageHead title="Pedidos" text={user.rol === "aliado" ? "Tus pedidos y en qué paso va cada uno." : "Todos los pedidos de la tienda y en qué paso va cada uno."}>
        {user.rol === "admin" && process.env.VERCEL_ENV !== "production" && <PruebaButton />}
      </PageHead>
      <dl className={styles.stats}>
        <div>
          <dt>Por preparar</dt>
          <dd>{n(cuenta("preparar"))}</dd>
        </div>
        <div>
          <dt>En camino</dt>
          <dd>{n(cuenta("camino"))}</dd>
        </div>
        <div>
          <dt>Entregados</dt>
          <dd>{n(cuenta("entregado"))}</dd>
        </div>
        <div>
          <dt>Cancelados</dt>
          <dd>{n(cuenta("cancelado"))}</dd>
        </div>
      </dl>
      <DataTable
        columns={columns}
        rows={pedidos.map((p) => ({
          id: p.id,
          folio: p.prueba ? `${p.folio} · prueba` : p.folio,
          folioHref: `/admin/pedidos/${p.id}`,
          fecha: fechaCdmx(p.creado),
          cliente: p.cliente,
          email: p.email,
          ciudad: p.ciudad,
          aliado: p.aliado,
          kits: p.kits,
          total: formatMXN((user.rol === "aliado" ? p.paraAliado : p.total) ?? 0),
          estadoLabel: p.pagoEnRevision ? "Pago en revisión" : ESTADO_LABEL[p.estado],
          tono: p.pagoEnRevision ? "aviso" : ESTADO_TONO[p.estado],
          etapa: ETAPA[p.estado],
        }))}
        searchKeys={["folio", "cliente", "email", "ciudad"]}
        searchLabel={user.rol === "aliado" ? "Buscar pedido, nombre o ciudad" : "Buscar pedido, nombre o correo"}
        filter={{
          key: "etapa",
          label: "Etapa del pedido",
          all: "Todos",
          initial: typeof etapa === "string" && ETAPAS.includes(etapa) && !verVencidos ? etapa : undefined,
          options: [
            { value: "preparar", label: "Por preparar" },
            { value: "camino", label: "En camino" },
            { value: "entregado", label: "Entregados" },
            { value: "cancelado", label: "Cancelados" },
            { value: "pendiente", label: "Sin pago" },
          ],
        }}
        noun={["pedido", "pedidos"]}
        empty={
          user.rol === "admin" && process.env.VERCEL_ENV !== "production"
            ? "Todavía no hay pedidos. Crea uno de prueba para ver cómo funciona."
            : "Todavía no hay pedidos. Llegan aquí en cuanto alguien pague en la tienda."
        }
      />
      {user.rol !== "aliado" && (verVencidos || vencidos > 0) && (
        <p className={s.vencidos}>
          <Link href={verVencidos ? "/admin/pedidos" : "/admin/pedidos?etapa=vencido"}>
            {verVencidos ? "Volver a los pedidos" : `Ver ${n(vencidos)} ${vencidos === 1 ? "pago que venció" : "pagos que vencieron"} sin completarse`}
          </Link>
        </p>
      )}
    </>
  );
}
