"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { BottlePlaceholder } from "@/app/_ui/BottlePlaceholder";
import { ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { pesos } from "@/lib/admin/catalogo-rules";
import { cambiarDisponible } from "../actions";
import styles from "../catalogo.module.css";

type Vino = {
  id: string;
  nombre: string;
  productor: string;
  anada: string;
  grupoId: string;
  grupo: string;
  aliadoId: string;
  aliado: string;
  precioCentavos: number;
  precioAntesCentavos: number | null;
  imagen: string | null;
  disponible: boolean;
  activo: boolean;
  tipo: string;
};
type Filtro = "" | "disponibles" | "agotados" | "ocultos";

export function VinosList({ vinos, grupos, aliados, editable }: { vinos: Vino[]; grupos: { id: string; nombre: string }[]; aliados: { id: string; nombre: string }[]; editable: boolean }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("");
  const [grupo, setGrupo] = useState("");
  const [aliado, setAliado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const q = useDeferredValue(query.trim().toLowerCase());

  const shown = useMemo(
    () =>
      vinos.filter(
        (v) =>
          (!q || `${v.nombre} ${v.productor}`.toLowerCase().includes(q)) &&
          (!grupo || v.grupoId === grupo) &&
          (!aliado || v.aliadoId === aliado) &&
          (filtro === "" || (filtro === "disponibles" && v.activo && v.disponible) || (filtro === "agotados" && v.activo && !v.disponible) || (filtro === "ocultos" && !v.activo)),
      ),
    [vinos, q, grupo, aliado, filtro],
  );
  const cuenta = (f: Filtro) => vinos.filter((v) => (f === "disponibles" ? v.activo && v.disponible : f === "agotados" ? v.activo && !v.disponible : !v.activo)).length;

  const toggle = (v: Vino) => {
    setError(null);
    setBusy(v.id);
    start(async () => {
      const r = await cambiarDisponible(v.id, !v.disponible);
      if (r.error) setError(r.error);
      setBusy(null);
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <span className="vv-sr-only">Buscar vino</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o productor" autoComplete="off" />
        </label>
        <div className={styles.selects}>
          {grupos.length > 1 && (
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Filtrar por grupo" className={styles.select}>
              <option value="">Todos los grupos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          )}
          {editable && aliados.length > 1 && (
            <select value={aliado} onChange={(e) => setAliado(e.target.value)} aria-label="Filtrar por aliado" className={styles.select}>
              <option value="">Todos los aliados</option>
              {aliados.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          )}
          {editable && (
            <ButtonLink href="/admin/catalogo/vinos/nuevo" size="md">
              Agregar vino
            </ButtonLink>
          )}
        </div>
      </div>
      <div className={styles.segments} role="group" aria-label="Filtrar por estado">
        {(
          [
            ["", "Todos", vinos.length],
            ["disponibles", "Disponibles", cuenta("disponibles")],
            ["agotados", "Agotados", cuenta("agotados")],
            ...(editable ? [["ocultos", "Ocultos", cuenta("ocultos")]] : []),
          ] as [Filtro, string, number][]
        ).map(([f, label, n]) => (
          <button key={f} type="button" className={styles.segment} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {label} <span>{n}</span>
          </button>
        ))}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {!editable && (
        <p className={styles.lock}>
          <Icon name="info" size={16} /> Los precios, textos y fotos los cambia Viviendo Vino. Si algo no está bien, escríbenos.
        </p>
      )}

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="bottle" size={24} />
          <p>{vinos.length === 0 ? "Todavía no hay vinos." : "Nada coincide con tu búsqueda."}</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {shown.map((v) => (
            <li key={v.id} className={`${styles.row} ${v.activo ? "" : styles.rowMuted}`} aria-busy={(pending && busy === v.id) || undefined}>
              <span className={styles.thumb} aria-hidden="true">
                {v.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniatura del catálogo
                  <img src={v.imagen} alt="" width={44} height={59} loading="lazy" />
                ) : (
                  <BottlePlaceholder kind={v.tipo === "espumoso" ? "sparkling" : "still"} label="" />
                )}
              </span>
              <div className={styles.body}>
                {editable ? (
                  <Link href={`/admin/catalogo/vinos/${v.id}`} className={styles.name}>
                    {v.nombre}
                  </Link>
                ) : (
                  <p className={styles.name}>{v.nombre}</p>
                )}
                <p className={styles.meta}>
                  {v.productor} · {v.grupo}
                  {editable && aliados.length > 1 ? ` · ${v.aliado}` : ""}
                  {!v.activo && <span className={styles.hidden}> · Oculto en la tienda</span>}
                </p>
              </div>
              <p className={styles.price}>
                {v.precioAntesCentavos && v.precioAntesCentavos > v.precioCentavos && (
                  <s className={styles.priceBefore}>
                    <span className="vv-sr-only">Antes </span>
                    {pesos(v.precioAntesCentavos)}
                  </s>
                )}
                {pesos(v.precioCentavos)}
                <span>por botella</span>
              </p>
              <button type="button" role="switch" aria-checked={v.disponible} className={styles.switch} disabled={pending} onClick={() => toggle(v)}>
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.thumbSwitch} />
                </span>
                <span className={styles.switchLabel}>{v.disponible ? "Disponible" : "Agotado"}</span>
                <span className="vv-sr-only">: {v.nombre}</span>
              </button>
              {editable && (
                <Link href={`/admin/catalogo/vinos/${v.id}`} className={styles.edit}>
                  Editar<span className="vv-sr-only"> {v.nombre}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
