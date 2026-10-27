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

const TZ = "America/Mexico_City";
const fechaHora = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const diaClave = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días" o la fecha. */
export function hace(iso: string, ahora = Date.now()): string {
  const t = Date.parse(iso);
  const min = Math.max(0, Math.floor((ahora - t) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  if (min < 24 * 60 && diaClave.format(t) === diaClave.format(ahora)) return `hace ${Math.floor(min / 60)} h`;
  if (diaClave.format(t) === diaClave.format(ahora - 86400000)) return "ayer";
  const dias = Math.round(min / 1440);
  return dias < 30 ? `hace ${Math.max(2, dias)} días` : fechaHora.format(t).replace(/\./g, "");
}

type Reciente = { id: string; at: string; titulo: string; detalle: string; marcas: string[]; tono?: "ok" | "aviso" };

/** Lo más reciente, en orden cronológico inverso: cuándo, qué salió y qué hizo la persona después. */
export function Recientes({ title, items, empty, ahora }: { title: string; items: Reciente[]; empty: string; ahora: number }) {
  return (
    <Panel title={title} note={items[0] ? `Último: ${hace(items[0].at, ahora)}` : undefined}>
      {items.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ol className={styles.recent}>
          {items.map((r) => (
            <li key={r.id}>
              <time dateTime={r.at} className={styles.when}>
                <strong>{hace(r.at, ahora)}</strong>
                <span>{fechaHora.format(new Date(r.at)).replace(/\./g, "")}</span>
              </time>
              <div className={styles.what}>
                <strong className={r.tono === "aviso" ? styles.aviso : undefined}>{r.titulo}</strong>
                {r.detalle && <span>{r.detalle}</span>}
              </div>
              {r.marcas.length > 0 && (
                <ul className={styles.marks} aria-label="Qué hizo después">
                  {r.marcas.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
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
                <span className={styles.fill} style={{ width: `${first ? Math.min(100, Math.max(s.value ? 2 : 0, share)) : 0}%` }} />
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
