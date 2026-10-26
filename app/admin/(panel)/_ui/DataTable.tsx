"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Icon } from "@/app/_ui/Icon";
import styles from "./table.module.css";

// Tabla del panel: búsqueda y filtros en el navegador (nada viaja en la URL, así ningún correo queda en el
// historial ni en los registros del servidor). En el celular cada fila se vuelve una tarjeta.

type Cell = string | number | boolean | null | undefined;
export type Row = { id: string } & Record<string, Cell>;
export type Column = {
  key: string;
  label: string;
  kind?: "email" | "text" | "num" | "bool" | "estado" | "fecha" | "link";
  /** En el celular la fila-tarjeta usa esta columna como título. */
  primary?: boolean;
};
type Filter = { key: string; label: string; options: { value: string; label: string }[] };

const PAGE = 100;

export function DataTable({
  columns,
  rows,
  searchKeys,
  searchLabel,
  filter,
  noun,
  empty,
}: {
  columns: Column[];
  rows: Row[];
  searchKeys: string[];
  searchLabel: string;
  filter?: Filter;
  noun: [string, string];
  empty: string;
}) {
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(query.trim().toLowerCase());

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!filter || !value || String(r[filter.key]) === value) &&
          (!q || searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q))),
      ),
    [rows, filter, value, q, searchKeys],
  );
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    if (filter) for (const r of rows) c.set(String(r[filter.key]), (c.get(String(r[filter.key])) ?? 0) + 1);
    return c;
  }, [rows, filter]);

  const label = (n: number) => `${n.toLocaleString("es-MX")} ${n === 1 ? noun[0] : noun[1]}`;
  const filtered = shown.length !== rows.length;

  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        <Icon name="users" size={24} />
        <p>{empty}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <span className="vv-sr-only">{searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={searchLabel}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {filter && (
          <div className={styles.segments} role="group" aria-label={filter.label}>
            {[{ value: "", label: "Todas" }, ...filter.options].map((o) => {
              const n = o.value ? (counts.get(o.value) ?? 0) : rows.length;
              return (
                <button
                  key={o.value}
                  type="button"
                  className={styles.segment}
                  aria-pressed={value === o.value}
                  onClick={() => {
                    setValue(o.value);
                    setLimit(PAGE);
                  }}
                >
                  {o.label} <span className={styles.segCount}>{n.toLocaleString("es-MX")}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className={styles.count} aria-live="polite">
        {filtered ? `${label(shown.length)} de ${rows.length.toLocaleString("es-MX")}` : label(rows.length)}
      </p>

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="search" size={24} />
          <p>Nada coincide con tu búsqueda.</p>
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              setQuery("");
              setValue("");
            }}
          >
            Quitar filtros
          </button>
        </div>
      ) : (
        <div className={styles.scroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={c.kind === "num" ? styles.num : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.label} className={`${c.primary ? styles.primary : ""} ${c.kind === "num" ? styles.num : ""}`}>
                      {render(c, r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shown.length > limit && (
        <button type="button" className={styles.more} onClick={() => setLimit((l) => l + PAGE)}>
          Mostrar {Math.min(PAGE, shown.length - limit)} más
        </button>
      )}
    </div>
  );
}

function render(c: Column, r: Row) {
  const v = r[c.key];
  if (c.kind === "bool") return <span className={v ? styles.yes : styles.no}>{v ? "Sí" : "No"}</span>;
  if (c.kind === "estado") {
    return (
      <span className={styles.estado} data-estado={String(r.tono ?? r.estado ?? "")}>
        <span className={styles.dot} aria-hidden="true" />
        {v}
      </span>
    );
  }
  if (c.kind === "link") {
    const href = r[`${c.key}Href`];
    return typeof href === "string" && href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
        {v}
      </a>
    ) : (
      <span className={styles.strong}>{v}</span>
    );
  }
  if (c.kind === "email") return <span className={styles.email}>{v}</span>;
  if (c.kind === "fecha") return <span className={styles.fecha}>{v}</span>;
  if (v === "" || v === null || v === undefined) return <span className={styles.none}>—</span>;
  return v;
}
