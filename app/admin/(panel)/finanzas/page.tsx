import type { Metadata } from "next";
import Link from "next/link";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { getFinanzas } from "@/lib/admin/pedidos";
import { ESTADO_LABEL, ESTADO_TONO } from "@/lib/admin/pedidos-rules";
import { requireAdmin } from "@/lib/admin/session";
import { formatMXNExacto as formatMXN } from "@/lib/money";
import c from "../_ui/charts.module.css";
import { DataTable } from "../_ui/DataTable";
import { PageHead } from "../_ui/PageHead";
import styles from "../_ui/panel.module.css";
import s from "./finanzas.module.css";
import { Transferencias } from "./Transferencias";

export const metadata: Metadata = { title: "Finanzas" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ searchParams }: PageProps<"/admin/finanzas">) {
  const user = await requireAdmin(["admin", "aliado"]);
  const pedido = (await searchParams).aliado;
  const f = await getFinanzas(user, typeof pedido === "string" && UUID.test(pedido) ? pedido : null);
  const esAliado = user.rol === "aliado";
  const r = f.resumen;
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
  const pruebas = f.ventas.filter((v) => v.prueba).length;

  return (
    <>
      <PageHead
        title="Finanzas"
        text={esAliado ? "Tus ventas, la comisión de Viviendo Vino, lo que te toca y lo que ya te transferimos." : "Ventas, comisiones y transferencias a cada aliado."}
      />
      {!f.aliado ? (
        <p className={s.muted}>No hay aliados todavía.</p>
      ) : (
        <div className={s.page}>
          {!esAliado && f.aliados.length > 1 && (
            <nav className={c.period} aria-label="Aliado">
              {f.aliados.map((a) => (
                <Link key={a.id} href={`/admin/finanzas?aliado=${a.id}`} aria-current={a.id === f.aliado!.id ? "true" : undefined} scroll={false}>
                  {a.nombre}
                </Link>
              ))}
            </nav>
          )}

          <dl className={styles.stats}>
            <div>
              <dt>
                Vendido · {r.ventas.toLocaleString("es-MX")} {r.ventas === 1 ? "pedido" : "pedidos"}
              </dt>
              <dd>{formatMXN(r.vendido)}</dd>
            </div>
            <div>
              <dt>Comisión Viviendo Vino · {f.aliado.comisionBps / 100} %</dt>
              <dd>{formatMXN(r.comision)}</dd>
            </div>
            <div>
              <dt>{esAliado ? "Para ti" : `Para ${f.aliado.nombre}`}</dt>
              <dd>{formatMXN(r.paraAliado)}</dd>
            </div>
            <div>
              <dt>{esAliado ? "Por recibir · de pedidos entregados" : "Por transferir · de pedidos entregados"}</dt>
              <dd className={r.saldo < 0 ? s.negativo : undefined}>{formatMXN(r.saldo)}</dd>
            </div>
          </dl>

          <ul className={s.facts}>
            <li>
              <span>Entregado (ya se {esAliado ? "te" : "le"} debe)</span>
              <strong>{formatMXN(r.ganado)}</strong>
            </li>
            <li>
              <span>Transferido</span>
              <strong>{formatMXN(r.transferido)}</strong>
            </li>
            <li>
              <span>En camino (se suma al entregarse)</span>
              <strong>{formatMXN(r.enCamino)}</strong>
            </li>
          </ul>
          {r.saldo < 0 && <p className={s.muted}>El saldo es negativo: se transfirió más de lo entregado hasta hoy (un adelanto).</p>}
          {pruebas > 0 && (
            <p className={s.muted}>
              Incluye {pruebas} {pruebas === 1 ? "pedido de prueba" : "pedidos de prueba"} (solo en dev).
            </p>
          )}

          <Transferencias
            aliadoId={f.aliado.id}
            aliado={f.aliado.nombre}
            items={f.transferencias}
            editable={user.rol === "admin"}
            hoy={hoy}
            sugerido={Math.max(0, r.saldo)}
          />

          <section className={s.card} aria-labelledby="ventas">
            <div className={s.cardHead}>
              <h2 id="ventas">Ventas por pedido</h2>
              <p className={s.muted}>Pedidos pagados; los cancelados y sin pago no cuentan.</p>
            </div>
            <DataTable
              columns={[
                { key: "folio", label: "Pedido", kind: "link", primary: true },
                { key: "fecha", label: "Fecha", kind: "fecha" },
                { key: "estadoLabel", label: "Estado", kind: "estado" },
                { key: "total", label: "Total", kind: "num" },
                { key: "comision", label: "Comisión", kind: "num" },
                { key: "aliado", label: esAliado ? "Para ti" : "Para el aliado", kind: "num" },
              ]}
              rows={f.ventas.map((v) => ({
                id: v.id,
                folio: v.prueba ? `${v.folio} · prueba` : v.folio,
                folioHref: `/admin/pedidos/${v.id}`,
                fecha: fechaCdmx(v.creado),
                estadoLabel: ESTADO_LABEL[v.estado],
                tono: ESTADO_TONO[v.estado],
                etapa: v.estado === "entregado" ? "entregado" : "camino",
                total: formatMXN(v.total),
                comision: formatMXN(v.comision),
                aliado: formatMXN(v.aliado),
              }))}
              searchKeys={["folio"]}
              searchLabel="Buscar por número de pedido"
              filter={{
                key: "etapa",
                label: "Entrega",
                options: [
                  { value: "entregado", label: "Entregados" },
                  { value: "camino", label: "Sin entregar" },
                ],
              }}
              noun={["venta", "ventas"]}
              empty="Todavía no hay ventas."
            />
          </section>
        </div>
      )}
    </>
  );
}
