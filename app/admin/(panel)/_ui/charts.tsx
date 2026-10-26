import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./charts.module.css";

// Gráficas del panel: una sola serie, en ciruela (Manual · 6, barras de dato), valores escritos junto a cada
// barra o en su tooltip, y una tabla para lectores de pantalla. Sin librerías: HTML y CSS.

type Barra = { key: string; label: string; value: number };
const n = (v: number) => v.toLocaleString("es-MX");

/** Barras horizontales con etiqueta y valor (distribuciones: perfiles, ocasiones, vinos más escaneados). */
export function BarList({ title, items, total, empty = "Sin datos en este periodo." }: { title: string; items: Barra[]; total?: number; empty?: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  const sum = total ?? items.reduce((a, b) => a + b.value, 0);
  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.barList}>
          {items.map((i) => (
            <li key={i.key}>
              <div className={styles.barHead}>
                <span className={styles.barLabel}>{i.label}</span>
                <span className={styles.barValue}>
                  {n(i.value)}
                  {sum > 0 && <span className={styles.barPct}> · {Math.round((100 * i.value) / sum)}%</span>}
                </span>
              </div>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.fill} style={{ width: `${max ? Math.max(2, (100 * i.value) / max) : 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Embudo: cada paso con su número y el % respecto al primero. */
export function Funnel({ title, steps, note }: { title: string; steps: Barra[]; note?: ReactNode }) {
  const first = steps[0]?.value ?? 0;
  return (
    <Panel title={title} note={note}>
      <ol className={styles.funnel}>
        {steps.map((s, i) => {
          const share = first ? (100 * s.value) / first : 0;
          return (
            <li key={s.key}>
              <div className={styles.barHead}>
                <span className={styles.barLabel}>{s.label}</span>
                <span className={styles.barValue}>
                  {n(s.value)}
                  {i > 0 && first > 0 && <span className={styles.barPct}> · {Math.round(share)}%</span>}
                </span>
              </div>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.fill} style={{ width: `${first ? Math.max(s.value ? 2 : 0, share) : 0}%` }} />
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/** Columnas por día. El valor de cada día aparece al pasar el cursor o enfocar; la tabla oculta los lista todos. */
export function DailyColumns({ title, days, unit }: { title: string; days: { dia: string; label: string; value: number }[]; unit: [string, string] }) {
  const max = Math.max(0, ...days.map((d) => d.value));
  const total = days.reduce((a, b) => a + b.value, 0);
  const u = (v: number) => `${n(v)} ${v === 1 ? unit[0] : unit[1]}`;
  const ticks = days.length > 14 ? [0, Math.floor(days.length / 2), days.length - 1] : days.map((_, i) => i);
  return (
    <Panel title={title} note={`${u(total)} en el periodo`}>
      {total === 0 ? (
        <p className={styles.empty}>Sin datos en este periodo.</p>
      ) : (
        <>
          <div className={styles.columns} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} aria-hidden="true">
            {days.map((d) => (
              <span key={d.dia} className={styles.col} data-tip={`${d.label}: ${u(d.value)}`}>
                <span className={styles.colFill} style={{ height: `${max ? (100 * d.value) / max : 0}%` }} />
              </span>
            ))}
          </div>
          <div className={styles.axis} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} aria-hidden="true">
            {days.map((d, i) => (
              <span key={d.dia} className={i === days.length - 1 ? styles.tickEnd : undefined}>
                {ticks.includes(i) ? d.label : ""}
              </span>
            ))}
          </div>
          <table className="vv-sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.dia}>
                  <td>{d.label}</td>
                  <td>{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  );
}

export function Panel({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      <header className={styles.panelHead}>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </header>
      {children}
    </section>
  );
}

/** Selector de periodo (enlaces: el periodo sí puede ir en la URL; no lleva datos personales). */
export function PeriodPicker({ base, value, options }: { base: string; value: string; options: readonly { value: string; label: string }[] }) {
  return (
    <nav className={styles.period} aria-label="Periodo">
      {options.map((o) => (
        <Link key={o.value} href={`${base}?periodo=${o.value}`} aria-current={o.value === value ? "true" : undefined} scroll={false}>
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
