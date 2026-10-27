import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/app/_ui/Notice";
import { getInicio, type Inicio } from "@/lib/admin/inicio";
import { ESTADO_LABEL, type EstadoPedido } from "@/lib/admin/pedidos-rules";
import { requireAdmin, type AdminUser } from "@/lib/admin/session";
import { capitalize, launch, longDay } from "@/lib/launch";
import { formatMXN } from "@/lib/money";
import { DailyColumns } from "./_ui/charts";
import { PageHead } from "./_ui/PageHead";
import styles from "./_ui/panel.module.css";
import s from "./inicio.module.css";

export const metadata: Metadata = { title: "Inicio" };

// Inicio: primero lo que pide acción hoy, luego cómo van las ventas, los aliados y la comunidad. Cada rol ve
// solo lo suyo: atención sin montos; el aliado, solo su tienda; comunidad y contenido, solo admin.

const n = (v: number) => v.toLocaleString("es-MX");
const plural = (v: number, uno: string, varios: string) => `${n(v)} ${v === 1 ? uno : varios}`;
const diaCorto = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short" });
const fechaCorta = (iso: string) => diaCorto.format(new Date(`${iso}T12:00:00Z`)).replace(/\./g, "");

function hace(horas: number) {
  if (horas < 48) return `hace ${Math.max(1, Math.round(horas))} h`;
  return `hace ${Math.round(horas / 24)} días`;
}

function Accion({ valor, label, nota, href, alerta }: { valor: number; label: string; nota: string; href?: string; alerta?: boolean }) {
  const tono = alerta && valor > 0 ? "alerta" : valor === 0 ? "cero" : undefined;
  const cuerpo = (
    <>
      <strong>{n(valor)}</strong>
      <span>{label}</span>
      <small>{nota}</small>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={s.action} data-tono={tono}>
          {cuerpo}
        </Link>
      ) : (
        <div className={s.action} data-tono={tono}>
          {cuerpo}
        </div>
      )}
    </li>
  );
}

function Pendientes({ d, user }: { d: Inicio; user: AdminUser }) {
  const p = d.pedidos;
  const conCatalogo = user.rol !== "atencion";
  const conCorreos = user.rol === "admin" && Boolean(d.comunidad);
  return (
    <section className={s.section} aria-labelledby="hoy">
      <div className={s.sectionHead}>
        <h2 id="hoy">Lo que necesita atención</h2>
        <Link href="/admin/pedidos">Ver todos los pedidos</Link>
      </div>
      <ul className={s.actions} data-n={4 + Number(conCatalogo) + Number(conCorreos)}>
        <Accion valor={p.por_preparar} label="Por preparar" nota="Pagados, sin enviar" href="/admin/pedidos?etapa=preparar" />
        <Accion valor={p.atrasados} label="Atrasados" nota="Pasaron su plazo de preparación" href="/admin/pedidos?etapa=preparar" alerta />
        <Accion valor={p.en_camino} label="En camino" nota="Enviados, sin confirmar entrega" href="/admin/pedidos?etapa=camino" />
        <Accion valor={p.entregados_hoy} label="Entregados hoy" nota="Confirmados hoy" href="/admin/pedidos?etapa=entregado" />
        {conCatalogo && <Accion valor={d.catalogo.agotados} label="Vinos agotados" nota={`De ${plural(d.catalogo.vinos, "vino", "vinos")} en la tienda`} href="/admin/catalogo/vinos" alerta />}
        {conCorreos && d.comunidad && (
          <Accion valor={d.comunidad.correos_fallidos_semana} label="Correos que no salieron" nota="Últimos 7 días" href="/admin/correos" alerta />
        )}
      </ul>
      {d.atrasados.length > 0 && (
        <ul className={s.late} aria-label="Pedidos atrasados, los más antiguos primero">
          {d.atrasados.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/pedidos/${a.id}`}>
                <strong>
                  {a.folio}
                  {a.prueba ? " · prueba" : ""}
                </strong>
                <em>Pagado {hace(a.horas)}</em>
                <span>
                  {ESTADO_LABEL[a.estado as EstadoPedido] ?? a.estado} · {a.ciudad}, {a.estado_mx}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Ventas({ d, user }: { d: Inicio; user: AdminUser }) {
  const v = d.ventas;
  const conMontos = user.rol !== "atencion";
  const dias = d.serie.map((x) => ({ dia: x.dia, label: fechaCorta(x.dia), value: conMontos ? x.total / 100 : x.n }));
  const pedidos = (m: { n: number }) => plural(m.n, "pedido", "pedidos");
  return (
    <section className={s.section} aria-labelledby="ventas">
      <div className={s.sectionHead}>
        <h2 id="ventas">{user.rol === "aliado" ? "Tus ventas" : "Ventas"}</h2>
        {conMontos && <Link href="/admin/finanzas">Ver finanzas</Link>}
      </div>
      <div className={s.split}>
        <dl className={styles.stats}>
          {conMontos ? (
            <>
              <div>
                <dt>Hoy · {pedidos(v.hoy)}</dt>
                <dd>{formatMXN(v.hoy.total)}</dd>
              </div>
              <div>
                <dt>Últimos 7 días · {pedidos(v.semana)}</dt>
                <dd>{formatMXN(v.semana.total)}</dd>
              </div>
              <div>
                <dt>Este mes · {pedidos(v.mes)}</dt>
                <dd>{formatMXN(v.mes.total)}</dd>
              </div>
              <div>
                <dt>{user.rol === "aliado" ? "Para ti este mes" : "Comisión del mes"}</dt>
                <dd>{formatMXN(user.rol === "aliado" ? v.mes.aliado : (v.mes.comision ?? 0))}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Pedidos hoy</dt>
                <dd>{n(v.hoy.n)}</dd>
              </div>
              <div>
                <dt>Últimos 7 días</dt>
                <dd>{n(v.semana.n)}</dd>
              </div>
              <div>
                <dt>Este mes</dt>
                <dd>{n(v.mes.n)}</dd>
              </div>
              <div>
                <dt>Esperando pago</dt>
                <dd>{n(d.pedidos.sin_pago)}</dd>
              </div>
            </>
          )}
        </dl>
        <DailyColumns
          title={conMontos ? "Ventas por día · últimos 30 días" : "Pedidos pagados por día · últimos 30 días"}
          days={dias}
          unit={["pedido", "pedidos"]}
          formato={conMontos ? (x) => formatMXN(Math.round(x * 100)) : undefined}
        />
      </div>
    </section>
  );
}

function Aliados({ d, user }: { d: Inicio; user: AdminUser }) {
  if (user.rol === "atencion" || d.aliados.length === 0) return null;
  const esAliado = user.rol === "aliado";
  return (
    <section className={s.section} aria-labelledby="aliados">
      <div className={s.sectionHead}>
        <h2 id="aliados">{esAliado ? "Tu saldo" : "Por transferir a cada aliado"}</h2>
      </div>
      <ul className={s.aliados}>
        {d.aliados.map((a) => (
          <li key={a.id}>
            <Link href={esAliado ? "/admin/finanzas" : `/admin/finanzas?aliado=${a.id}`}>
              <b>{esAliado ? "Por recibir de pedidos entregados" : a.nombre}</b>
              <span>
                {esAliado ? "Saldo" : "Por transferir"} <strong>{formatMXN(a.por_transferir)}</strong>
              </span>
              <span>
                En camino <strong>{formatMXN(a.en_camino)}</strong>
                {a.ultima_transferencia ? ` · última transferencia ${fechaCorta(a.ultima_transferencia)}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Comunidad({ c }: { c: NonNullable<Inicio["comunidad"]> }) {
  return (
    <section className={s.section} aria-labelledby="comunidad">
      <div className={s.sectionHead}>
        <h2 id="comunidad">Comunidad y contenido · últimos 7 días</h2>
      </div>
      <ul className={s.actions} data-n={5}>
        <Accion valor={c.lista_semana} label="Nuevos en la lista" nota={`${plural(c.lista_total, "persona", "personas")} en total`} href="/admin/comunidad/lista-de-espera" />
        <Accion valor={c.quiz_semana} label="Quizzes terminados" nota="Perfil y kit recomendado" href="/admin/contenido/quiz" />
        <Accion valor={c.scans_semana} label="Etiquetas escaneadas" nota="Wine Scan" href="/admin/contenido/wine-scan" />
        <Accion valor={c.guias_semana} label="Guías pedidas" nota="PDF del blog" href="/admin/comunidad/guias" />
        <Accion valor={c.anuncios_activos} label="Mensajes en la marquesina" nota="Activos ahora" href="/admin/anuncios" />
      </ul>
    </section>
  );
}

export default async function Page() {
  const user = await requireAdmin(["admin", "aliado", "atencion"]);
  const { datos, faltaSql, ahora, diasParaAbrir } = await getInicio(user);
  const nombre = user.nombre.split(/\s+/)[0];

  return (
    <>
      <PageHead title={`Hola, ${nombre}`} text={`${capitalize(longDay(ahora))}. Cómo va la tienda hoy y qué necesita tu atención.`} />
      <div className={s.page}>
        {diasParaAbrir !== null && (
          <p className={s.launch}>
            Faltan <strong>{plural(diasParaAbrir, "día", "días")}</strong> para abrir la tienda · {launch.day}, {launch.time}.
          </p>
        )}
        {faltaSql && <Notice kind="aviso">Falta correr el SQL del Inicio (20261103000000_inicio.sql) para ver las cifras.</Notice>}
        {!datos && !faltaSql && <p className={s.muted}>Tu cuenta aún no está ligada a un aliado. Pide a un administrador que lo revise en Configuración → Equipo.</p>}
        {datos && (
          <>
            <Pendientes d={datos} user={user} />
            <Ventas d={datos} user={user} />
            <Aliados d={datos} user={user} />
            {user.rol === "admin" && datos.comunidad && <Comunidad c={datos.comunidad} />}
          </>
        )}
      </div>
    </>
  );
}
