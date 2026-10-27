import type { Metadata } from "next";
import { getScanMetricas, paginaDe, periodoDe, PERIODOS } from "@/lib/admin/metricas";
import { requireAdmin } from "@/lib/admin/session";
import { BarList, DailyColumns, PeriodPicker, Recientes } from "../../_ui/charts";
import c from "../../_ui/charts.module.css";
import styles from "../../_ui/panel.module.css";

export const metadata: Metadata = { title: "Wine Scan · Contenido" };

export default async function Page({ searchParams }: PageProps<"/admin/contenido/wine-scan">) {
  await requireAdmin(["admin"]);
  const sp = await searchParams;
  const periodo = periodoDe(sp.periodo);
  const m = await getScanMetricas(periodo, paginaDe(sp.pagina));
  const n = (v: number) => v.toLocaleString("es-MX");
  const opiniones = m.resumen.meSirvio + m.resumen.noMeSirvio;
  return (
    <>
      <div className={c.toolbar}>
        <PeriodPicker base="/admin/contenido/wine-scan" value={periodo} options={PERIODOS} />
        <p>Sin fotos ni datos personales: solo el resultado de cada escaneo.</p>
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Escaneos</dt>
          <dd>{n(m.resumen.total)}</dd>
        </div>
        <div>
          <dt>Con guía completa · {m.resumen.tasaGuia}%</dt>
          <dd>{n(m.resumen.guias)}</dd>
        </div>
        <div>
          <dt>Recomendaron un vino del catálogo</dt>
          <dd>{m.resumen.conRecomendacion}%</dd>
        </div>
        <div>
          <dt>Le sirvió · {n(opiniones)} {opiniones === 1 ? "opinión" : "opiniones"}</dt>
          <dd>{opiniones ? `${m.resumen.tasaSirvio}%` : "—"}</dd>
        </div>
      </dl>
      <div className={c.grid}>
        <div className={c.wide}>
          <Recientes
            title="Últimos escaneos"
            items={m.recientes}
            ahora={m.ahora}
            pag={m.historial}
            unidad={["escaneo", "escaneos"]}
            href={(pg) => `/admin/contenido/wine-scan?periodo=${periodo}${pg > 1 ? `&pagina=${pg}` : ""}#historial`}
            empty="Todavía nadie ha escaneado una etiqueta."
          />
        </div>
        <div className={c.wide}>
          <DailyColumns title="Escaneos por día" days={m.porDia} unit={["escaneo", "escaneos"]} />
        </div>
        <BarList title="Vinos más escaneados" items={m.vinos} total={m.resumen.guias} empty="Todavía no hay vinos leídos en este periodo." />
        <BarList title="Cómo terminó cada escaneo" items={m.resultados} />
        <BarList title="Confianza al identificar el vino" items={m.confianza} />
        <section className={c.panel}>
          <header className={c.panelHead}>
            <h2>Cómo responde la IA</h2>
          </header>
          <ul className={c.facts}>
            <li>
              <span>Tiempo promedio</span>
              <strong>{m.tecnico.latenciaMedia !== null ? `${(m.tecnico.latenciaMedia / 1000).toFixed(1)} s` : "—"}</strong>
            </li>
            <li>
              <span>Escaneos con error</span>
              <strong>{n(m.tecnico.errores)}</strong>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
