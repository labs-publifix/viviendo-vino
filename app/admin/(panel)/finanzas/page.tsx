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
        text={esAliado ? "Tus ventas a tus precios acordados, lo que ya te transferimos y lo que falta por recibir." : "Ventas, lo de cada aliado a sus precios acordados, el margen de Viviendo Vino y las transferencias."}
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

          {esAliado ? (
            <dl className={styles.stats}>
              <div>
                <dt>
                  Tus ventas · {r.ventas.toLocaleString("es-MX")} {r.ventas === 1 ? "pedido" : "pedidos"}
                </dt>
                <dd>{formatMXN(r.paraAliado)}</dd>
              </div>
              <div>
                <dt>Entregado (ya se te debe)</dt>
                <dd>{formatMXN(r.ganado)}</dd>
              </div>
              <div>
                <dt>Transferido</dt>
                <dd>{formatMXN(r.transferido)}</dd>
              </div>
              <div>
                <dt>Por recibir · de pedidos entregados</dt>
                <dd className={r.saldo < 0 ? s.negativo : undefined}>{formatMXN(r.saldo)}</dd>
              </div>
            </dl>
          ) : (
            <dl className={styles.stats}>
              <div>
                <dt>
                  Vendido · {r.ventas.toLocaleString("es-MX")} {r.ventas === 1 ? "pedido" : "pedidos"}
                </dt>
                <dd>{formatMXN(r.vendido)}</dd>
              </div>
              <div>
                <dt>Para {f.aliado.nombre} · precios acordados</dt>
                <dd>{formatMXN(r.paraAliado)}</dd>
              </div>
              <div>
                <dt>Margen neto · {formatMXN(r.margen)} − Mercado Pago {formatMXN(r.mp)}</dt>
                <dd>{formatMXN(r.margenNeto)}</dd>
              </div>
              <div>
                <dt>Por transferir · de pedidos entregados</dt>
                <dd className={r.saldo < 0 ? s.negativo : undefined}>{formatMXN(r.saldo)}</dd>
              </div>
            </dl>
          )}

          <ul className={s.facts}>
            {!esAliado && (
              <li>
                <span>Entregado (ya se le debe)</span>
                <strong>{formatMXN(r.ganado)}</strong>
              </li>
            )}
            {!esAliado && (
              <li>
                <span>Transferido</span>
                <strong>{formatMXN(r.transferido)}</strong>
              </li>
            )}
            <li>
              <span>En camino (se suma al entregarse)</span>
              <strong>{formatMXN(r.enCamino)}</strong>
            </li>
            {!esAliado && (
              <li>
                <span>Mercado Pago</span>
                <strong>estimado hasta conectar el cobro</strong>
              </li>
            )}
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
              columns={
                esAliado
                  ? [
                      { key: "folio", label: "Pedido", kind: "link", primary: true },
                      { key: "fecha", label: "Fecha", kind: "fecha" },
                      { key: "estadoLabel", label: "Estado", kind: "estado" },
                      { key: "kits", label: "Kits", kind: "num" },
                      { key: "aliado", label: "Para ti", kind: "num" },
                    ]
                  : [
                      { key: "folio", label: "Pedido", kind: "link", primary: true },
                      { key: "fecha", label: "Fecha", kind: "fecha" },
                      { key: "estadoLabel", label: "Estado", kind: "estado" },
                      { key: "total", label: "Cobrado", kind: "num" },
                      { key: "aliado", label: "Para el aliado", kind: "num" },
                      { key: "margen", label: "Margen", kind: "num" },
                      { key: "neto", label: "Neto (− MP)", kind: "num" },
                    ]
              }
              rows={f.ventas.map((v) => ({
                id: v.id,
                folio: v.prueba ? `${v.folio} · prueba` : v.folio,
                folioHref: `/admin/pedidos/${v.id}`,
                fecha: fechaCdmx(v.creado),
                estadoLabel: ESTADO_LABEL[v.estado],
                tono: ESTADO_TONO[v.estado],
                etapa: v.estado === "entregado" ? "entregado" : "camino",
                kits: v.kits,
                total: formatMXN(v.total),
                aliado: formatMXN(v.aliado),
                margen: formatMXN(v.margen),
                neto: formatMXN(v.margen - v.mp),
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
