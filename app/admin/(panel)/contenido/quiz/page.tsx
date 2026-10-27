import type { Metadata } from "next";
import { getQuizMetricas, periodoDe, PERIODOS } from "@/lib/admin/metricas";
import { requireAdmin } from "@/lib/admin/session";
import { BarList, DailyColumns, Funnel, PeriodPicker, Recientes } from "../../_ui/charts";
import c from "../../_ui/charts.module.css";
import styles from "../../_ui/panel.module.css";

export const metadata: Metadata = { title: "Quiz IA · Contenido" };

export default async function Page({ searchParams }: PageProps<"/admin/contenido/quiz">) {
  await requireAdmin(["admin"]);
  const periodo = periodoDe((await searchParams).periodo);
  const m = await getQuizMetricas(periodo);
  const n = (v: number) => v.toLocaleString("es-MX");
  return (
    <>
      <div className={c.toolbar}>
        <PeriodPicker base="/admin/contenido/quiz" value={periodo} options={PERIODOS} />
        <p>Datos anónimos: no se guarda quién respondió.</p>
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Empezaron</dt>
          <dd>{n(m.resumen.empezaron)}</dd>
        </div>
        <div>
          <dt>Vieron su resultado · {m.resumen.tasaFin}%</dt>
          <dd>{n(m.resumen.terminaron)}</dd>
        </div>
        <div>
          <dt>Agregaron al carrito · {m.resumen.tasaCarrito}%</dt>
          <dd>{n(m.resumen.carrito)}</dd>
        </div>
        <div>
          <dt>Compartieron su perfil</dt>
          <dd>{n(m.resumen.compartieron)}</dd>
        </div>
      </dl>
      <div className={c.grid}>
        <div className={c.wide}>
          <Recientes title="Últimos quizzes" items={m.recientes} ahora={m.ahora} empty="Todavía nadie ha terminado el quiz." />
        </div>
        <div className={c.wide}>
          <DailyColumns title="Resultados por día" days={m.porDia} unit={["resultado", "resultados"]} />
        </div>
        <Funnel title="Del inicio al carrito" steps={m.embudo} note="Personas distintas · % respecto a quienes empezaron" />
        <BarList title="Hasta qué pregunta llegan" items={m.preguntas} total={m.resumen.empezaron} />
        <BarList title="Perfiles que más salen" items={m.perfiles} />
        <BarList title="Para qué es la caja" items={m.ocasiones} />
        <BarList title="Presupuesto" items={m.presupuestos} />
        <section className={`${c.panel}`}>
          <header className={c.panelHead}>
            <h2>Cómo responde la IA</h2>
          </header>
          <ul className={c.facts}>
            <li>
              <span>Tiempo promedio del resultado</span>
              <strong>{m.tecnico.latenciaMedia !== null ? `${(m.tecnico.latenciaMedia / 1000).toFixed(1)} s` : "—"}</strong>
            </li>
            <li>
              <span>Textos reutilizados (más rápido y barato)</span>
              <strong>{m.tecnico.narrativaCache}%</strong>
            </li>
            <li>
              <span>Resultados con texto de respaldo (sin IA)</span>
              <strong>{m.tecnico.textoRespaldo}%</strong>
            </li>
            <li>
              <span>Personas que repitieron el quiz</span>
              <strong>{n(m.tecnico.repeticiones)}</strong>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
