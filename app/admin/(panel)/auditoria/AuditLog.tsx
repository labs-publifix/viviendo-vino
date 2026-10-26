"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { SelectField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import type { Cambio } from "@/lib/admin/audit-format";
import styles from "./auditoria.module.css";

export type Evento = {
  id: string;
  dia: string;
  hora: string;
  fecha: string;
  persona: string;
  personaKey: string;
  accion: string;
  seccion: string;
  seccionKey: string;
  resumen: string;
  cambios: Cambio[];
};

const PAGE = 100;

export function AuditLog({ eventos, limite }: { eventos: Evento[]; limite: number }) {
  const [persona, setPersona] = useState("");
  const [seccion, setSeccion] = useState("");
  const [query, setQuery] = useState("");
  const [max, setMax] = useState(PAGE);
  const q = useDeferredValue(query.trim().toLowerCase());

  const personas = useMemo(() => [...new Map(eventos.map((e) => [e.personaKey, e.persona])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [eventos]);
  const secciones = useMemo(() => [...new Map(eventos.map((e) => [e.seccionKey, e.seccion])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [eventos]);
  const shown = useMemo(
    () =>
      eventos.filter(
        (e) =>
          (!persona || e.personaKey === persona) &&
          (!seccion || e.seccionKey === seccion) &&
          (!q || `${e.persona} ${e.accion} ${e.seccion} ${e.resumen}`.toLowerCase().includes(q)),
      ),
    [eventos, persona, seccion, q],
  );

  // Agrupado por día, en el orden en que llegan (del más reciente al más antiguo).
  const grupos = useMemo(() => {
    const out: { dia: string; items: Evento[] }[] = [];
    for (const e of shown.slice(0, max)) {
      const last = out.at(-1);
      if (last && last.dia === e.dia) last.items.push(e);
      else out.push({ dia: e.dia, items: [e] });
    }
    return out;
  }, [shown, max]);

  if (eventos.length === 0) {
    return (
      <div className={styles.empty}>
        <Icon name="history" size={24} />
        <p>Todavía no hay cambios registrados. Aquí aparece cada cosa que se cambie en el panel.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <span className="vv-sr-only">Buscar en la auditoría</span>
          <input type="search" value={query} onChange={(e) => (setQuery(e.target.value), setMax(PAGE))} placeholder="Buscar un mensaje, una persona…" autoComplete="off" />
        </label>
        <SelectField label="Persona" value={persona} onChange={(e) => (setPersona(e.target.value), setMax(PAGE))}>
          <option value="">Todas</option>
          {personas.map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <SelectField label="Sección" value={seccion} onChange={(e) => (setSeccion(e.target.value), setMax(PAGE))}>
          <option value="">Todas</option>
          {secciones.map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
      </div>

      <p className={styles.count} aria-live="polite">
        {shown.length === eventos.length ? `${eventos.length.toLocaleString("es-MX")} cambios` : `${shown.length.toLocaleString("es-MX")} de ${eventos.length.toLocaleString("es-MX")} cambios`}
        {eventos.length >= limite && ` (los ${limite.toLocaleString("es-MX")} más recientes)`}
      </p>

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="search" size={24} />
          <p>Nada coincide con esos filtros.</p>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.dia} className={styles.day} aria-label={g.dia}>
            <h2 className={styles.dayTitle}>{g.dia}</h2>
            <ol className={styles.list}>
              {g.items.map((e) => (
                <li key={e.id}>
                  <details className={styles.item}>
                    <summary>
                      <time className={styles.hora} title={e.fecha}>
                        {e.hora}
                      </time>
                      <span className={styles.what}>
                        <strong>{e.persona}</strong> {e.accion.toLowerCase()} {e.resumen && <span className={styles.res}>{e.resumen}</span>}
                      </span>
                      <span className={styles.tag}>{e.seccion}</span>
                      <Icon name="chevron" size={16} />
                    </summary>
                    {e.cambios.length > 0 ? (
                      <table className={styles.diff}>
                        <thead>
                          <tr>
                            <th scope="col">Campo</th>
                            <th scope="col">Antes</th>
                            <th scope="col">Después</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.cambios.map((c) => (
                            <tr key={c.campo}>
                              <th scope="row">{c.campo}</th>
                              <td className={styles.before}>{c.antes}</td>
                              <td>{c.despues}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className={styles.noDiff}>Sin campos que comparar en este cambio.</p>
                    )}
                  </details>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      {shown.length > max && (
        <button type="button" className={styles.more} onClick={() => setMax((m) => m + PAGE)}>
          Mostrar {Math.min(PAGE, shown.length - max)} más
        </button>
      )}
    </div>
  );
}
