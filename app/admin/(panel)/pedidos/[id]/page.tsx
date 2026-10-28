import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/app/_ui/Notice";
import { Icon } from "@/app/_ui/Icon";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { getPedido } from "@/lib/admin/pedidos";
import { accionesPara, ESTADO_LABEL, ESTADO_TONO, lineaDeTiempo, puedeReenviar, type EstadoPedido } from "@/lib/admin/pedidos-rules";
import { requireAdmin } from "@/lib/admin/session";
import { formatMXN, formatMXNExacto } from "@/lib/money";
import { Acciones, NotaForm, Reenviar } from "./PedidoForms";
import s from "../pedidos.module.css";

export const metadata: Metadata = { title: "Pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function evento(e: { tipo: string; estado: string | null; detalle: string }) {
  if (e.tipo === "creado") return { titulo: "Pedido creado", texto: e.detalle };
  if (e.tipo === "estado" && e.estado)
    return {
      titulo: `Pasó a “${ESTADO_LABEL[e.estado as EstadoPedido] ?? e.estado}”`,
      texto: e.detalle,
    };
  if (e.tipo === "nota") return { titulo: "Nota", texto: e.detalle };
  return { titulo: e.tipo, texto: e.detalle };
}

export default async function Page({
  params,
  searchParams,
}: PageProps<"/admin/pedidos/[id]">) {
  const user = await requireAdmin(["admin", "aliado", "atencion"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const p = await getPedido(user, id);
  if (!p) notFound();
  const aviso = (await searchParams).aviso;
  const acciones = accionesPara(p.estado, user.rol, p.prueba);
  const imp = p.importes;
  const botellas = p.kits.reduce(
    (a, k) => a + k.items.reduce((b, i) => b + i.cantidad, 0),
    0,
  );

  return (
    <div className={s.page}>
      <Link href="/admin/pedidos" className={s.back}>
        <Icon name="arrow" size={16} />
        Pedidos
      </Link>

      <header className={s.head}>
        <div>
          <h1 className={s.title}>
            Pedido {p.folio}
            {p.prueba && <span className={s.tag}>Prueba</span>}
          </h1>
          <p className={s.sub}>
            {fechaCdmx(p.creado)}
            {user.rol !== "aliado" && p.aliado ? ` · ${p.aliado}` : ""}
          </p>
        </div>
        <span className={s.estado} data-tono={ESTADO_TONO[p.estado]}>
          <span className={s.dot} aria-hidden="true" />
          {ESTADO_LABEL[p.estado]}
        </span>
      </header>

      {aviso === "creado" && p.eventos.length === 1 && (
        <Notice kind="ok">
          Pedido de prueba creado y marcado como pagado. Ya puedes moverlo de
          estado.
        </Notice>
      )}

      <div className={s.layout}>
        <div className={s.main}>
          <section className={`${s.card} ${s.items}`} aria-labelledby="lleva">
            <h2 id="lleva">
              Qué lleva{" "}
              <span className={s.muted}>
                · {p.kits.length} {p.kits.length === 1 ? "kit" : "kits"},{" "}
                {botellas} botellas
              </span>
            </h2>
            {p.kits.map((k, i) => (
              <div key={k.id} className={s.kit}>
                <p className={s.kitHead}>
                  <strong>
                    Kit {i + 1} · {k.grupo}
                  </strong>
                  <span>{formatMXN(k.total)}</span>
                </p>
                <ul className={s.lines}>
                  {k.items.map((it) => (
                    <li key={it.slug}>
                      <span className={s.qty}>{it.cantidad} ×</span>
                      <span className={s.name}>{it.nombre}</span>
                      <span className={s.price}>
                        {formatMXN((it.precio ?? it.precioAliado ?? 0) * it.cantidad)}
                        {it.precio !== null && it.precioAliado !== null && (
                          <small className={s.costo}>acordado {formatMXN(it.precioAliado * it.cantidad)}</small>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <dl className={s.totals}>
              {imp.total !== null ? (
                <>
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{formatMXNExacto(imp.subtotal ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Envío</dt>
                    <dd>{imp.envio ? formatMXNExacto(imp.envio) : "Incluido"}</dd>
                  </div>
                  <div className={s.total}>
                    <dt>Total cobrado</dt>
                    <dd>{formatMXNExacto(imp.total)}</dd>
                  </div>
                </>
              ) : (
                imp.paraAliado !== null && (
                  // Rol Aliado: solo lo suyo, a sus precios acordados.
                  <div className={s.total}>
                    <dt>Para ti (precios acordados)</dt>
                    <dd>{formatMXNExacto(imp.paraAliado)}</dd>
                  </div>
                )
              )}
              {imp.margen !== null && imp.paraAliado !== null && (
                <>
                  <div className={s.split}>
                    <dt>Para el aliado (precios acordados)</dt>
                    <dd>{formatMXNExacto(imp.paraAliado)}</dd>
                  </div>
                  <div className={s.split}>
                    <dt>{imp.modelo === "broker" ? "Margen de Viviendo Vino" : `Comisión Viviendo Vino (${(imp.comisionBps ?? 0) / 100} %)`}</dt>
                    <dd>{formatMXNExacto(imp.margen)}</dd>
                  </div>
                  {imp.modelo === "broker" && imp.mp !== null && (
                    <>
                      <div className={s.split}>
                        <dt>Mercado Pago{imp.mpReal ? "" : " (estimado)"}</dt>
                        <dd>−{formatMXNExacto(imp.mp)}</dd>
                      </div>
                      <div className={`${s.split} ${s.neto}`}>
                        <dt>Margen neto</dt>
                        <dd>{formatMXNExacto(imp.margen - imp.mp)}</dd>
                      </div>
                    </>
                  )}
                </>
              )}
            </dl>
          </section>

          <section
            className={`${s.card} ${s.historial}`}
            aria-labelledby="historial"
          >
            <h2 id="historial">Historial</h2>
            <ol className={s.timeline}>
              {lineaDeTiempo(p.eventos, p.correos).map((l) => {
                if (l.kind === "correo") {
                  const fallo = l.fallidos > 0;
                  const equipo = l.para === "equipo";
                  const total = l.enviados + l.fallidos;
                  const titulo = equipo
                    ? `Aviso de nuevo pedido ${fallo ? `enviado a ${l.enviados} de ${total}` : `enviado a ${total}`} ${total === 1 ? "persona" : "personas"} del equipo`
                    : `${l.reenvio ? "Correo reenviado" : "Correo"} “${l.titulo}” ${fallo ? "no se pudo enviar" : "enviado"} al cliente`;
                  return (
                    <li key={`c${l.id}`} data-tipo="correo" data-fallo={fallo || undefined}>
                      <p className={s.evHead}>
                        <strong>{titulo}</strong>
                        <time dateTime={l.at}>{fechaCdmx(l.at)}</time>
                      </p>
                      {l.destinatarios.length > 0 && <p className={s.evWho}>{l.destinatarios.join(", ")}</p>}
                      {!equipo && puedeReenviar(l.tipo, p.estado, user.rol) && <Reenviar id={p.id} tipo={l.tipo} fallo={fallo} />}
                    </li>
                  );
                }
                const t = evento(l);
                return (
                  <li key={l.id} data-tipo={l.tipo}>
                    <p className={s.evHead}>
                      <strong>{t.titulo}</strong>
                      <time dateTime={l.at}>{fechaCdmx(l.at)}</time>
                    </p>
                    {t.texto && <p className={s.evText}>{t.texto}</p>}
                    {l.quien && <p className={s.evWho}>{l.quien}</p>}
                  </li>
                );
              })}
            </ol>
            <NotaForm id={p.id} />
          </section>
        </div>
        <div className={s.side}>
          <section
            className={`${s.card} ${s.next}`}
            aria-labelledby="siguiente"
          >
            <h2 id="siguiente">Siguiente paso</h2>
            {acciones.length ? (
              <Acciones id={p.id} acciones={acciones} />
            ) : (
              <p className={s.muted}>
                {p.estado === "entregado"
                  ? "Pedido entregado. No hay nada más que hacer."
                  : p.estado === "cancelado"
                    ? `Pedido cancelado.${p.motivoCancelacion ? ` Motivo: ${p.motivoCancelacion}` : ""}`
                    : "Este pedido espera el pago del cliente."}
              </p>
            )}
          </section>

          <section className={`${s.card} ${s.envio}`} aria-labelledby="envio">
            <h2 id="envio">Envío</h2>
            <address className={s.address}>
              <strong>{p.envio.recibe || p.cliente.nombre}</strong>
              <span>{p.envio.calle}</span>
              <span>
                {p.envio.colonia}, CP {p.envio.codigoPostal}
              </span>
              <span>
                {p.envio.ciudad}, {p.envio.estado}
              </span>
            </address>
            {p.envio.referencias && (
              <p className={s.note}>Referencias: {p.envio.referencias}</p>
            )}
            {p.envio.guia && (
              <p className={s.guia}>
                <span>{p.envio.paqueteria}</span>
                <strong>{p.envio.guia}</strong>
              </p>
            )}
          </section>

          <section
            className={`${s.card} ${s.cliente}`}
            aria-labelledby="cliente"
          >
            <h2 id="cliente">Cliente</h2>
            <dl className={s.facts}>
              <div>
                <dt>Nombre</dt>
                <dd>{p.cliente.nombre}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>
                  <a href={`tel:+52${p.cliente.telefono}`}>
                    {p.cliente.telefono.replace(
                      /(\d{2})(\d{4})(\d{4})/,
                      "$1 $2 $3",
                    )}
                  </a>
                </dd>
              </div>
              {p.cliente.email && (
                <div>
                  <dt>Correo</dt>
                  <dd>{p.cliente.email}</dd>
                </div>
              )}
              <div>
                <dt>Factura</dt>
                <dd>{p.cliente.factura ? "Sí la pidió" : "No"}</dd>
              </div>
            </dl>
            {p.pagos.length > 0 && (
              <p className={s.muted}>
                Pago{" "}
                {p.pagos[0].proveedor === "prueba"
                  ? "de prueba"
                  : "con Mercado Pago"}{" "}
                ·{" "}
                {p.pagos[0].estado === "aprobado"
                  ? "aprobado"
                  : p.pagos[0].estado}{" "}
                · {formatMXNExacto(p.pagos[0].monto)}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
