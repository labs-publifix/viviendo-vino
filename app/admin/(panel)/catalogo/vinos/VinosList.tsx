"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { BottlePlaceholder } from "@/app/_ui/BottlePlaceholder";
import { ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { pesos } from "@/lib/admin/catalogo-rules";
import { estadoInventario } from "@/lib/inventario/rules";
import styles from "../catalogo.module.css";
import { Existencias } from "./Existencias";
import { Select } from "../../_ui/Select";

type Vino = {
  id: string;
  nombre: string;
  productor: string;
  anada: string;
  grupoId: string;
  grupo: string;
  aliadoId: string;
  aliado: string;
  /** null para el rol Aliado: no ve el precio público. */
  precioCentavos: number | null;
  precioAntesCentavos: number | null;
  precioAliadoCentavos: number | null;
  imagen: string | null;
  existencias: number;
  apartadas: number;
  activo: boolean;
  tipo: string;
};
type Filtro = "" | "con" | "pocas" | "agotados" | "ocultos";

/**
 * Lista de vinos. `editable`: admin (precios, textos, fotos). `inventario`: puede mover existencias (admin y el
 * aliado con sus vinos); atención solo las consulta.
 */
export function VinosList({ vinos, grupos, aliados, editable, inventario, filtroInicial = "" }: { vinos: Vino[]; grupos: { id: string; nombre: string }[]; aliados: { id: string; nombre: string }[]; editable: boolean; inventario: boolean; filtroInicial?: string }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>((["con", "pocas", "agotados", "ocultos"] as string[]).includes(filtroInicial) ? (filtroInicial as Filtro) : "");
  const [grupo, setGrupo] = useState("");
  const [aliado, setAliado] = useState("");
  // Existencias que cambiaron en esta pantalla (para que los filtros y cuentas sigan al momento).
  const [vivas, setVivas] = useState<Record<string, number>>({});
  const q = useDeferredValue(query.trim().toLowerCase());
  const stock = (v: Vino) => vivas[v.id] ?? v.existencias;
  const cumple = (v: Vino, f: Filtro) => {
    if (f === "ocultos") return !v.activo;
    if (f === "") return true;
    if (!v.activo) return false;
    const e = estadoInventario(stock(v));
    return f === "con" ? e !== "agotado" : f === "pocas" ? e === "pocas" : e === "agotado";
  };

  const shown = useMemo(
    () =>
      vinos.filter(
        (v) =>
          (!q || `${v.nombre} ${v.productor}`.toLowerCase().includes(q)) &&
          (!grupo || v.grupoId === grupo) &&
          (!aliado || v.aliadoId === aliado) &&
          cumple(v, filtro),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cumple depende de vivas
    [vinos, q, grupo, aliado, filtro, vivas],
  );
  const cuenta = (f: Filtro) => vinos.filter((v) => cumple(v, f)).length;

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
            <Select variant="filter" label="Filtrar por grupo" hideLabel value={grupo} onChange={setGrupo} options={[{ value: "", label: "Todos los grupos" }, ...grupos.map((g) => ({ value: g.id, label: g.nombre }))]} />
          )}
          {editable && aliados.length > 1 && (
            <Select variant="filter" label="Filtrar por aliado" hideLabel value={aliado} onChange={setAliado} options={[{ value: "", label: "Todos los aliados" }, ...aliados.map((a) => ({ value: a.id, label: a.nombre }))]} />
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
            ["con", "Con existencias", cuenta("con")],
            ["pocas", "Pocas (3 o menos)", cuenta("pocas")],
            ["agotados", "Agotados", cuenta("agotados")],
            ...(editable ? [["ocultos", "Ocultos", cuenta("ocultos")]] : []),
          ] as [Filtro, string, number][]
        ).map(([f, label, n]) => (
          <button key={f} type="button" className={styles.segment} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {label} <span>{n}</span>
          </button>
        ))}
      </div>
      {!editable && (
        <p className={styles.lock}>
          <Icon name="info" size={16} />
          {inventario
            ? " Lleva aquí las botellas que tienes de cada vino: con − y + se guarda solo. Los precios, textos y fotos los cambia Viviendo Vino."
            : " Consulta cuántas botellas hay de cada vino. Las cambian el administrador y el aliado."}
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
            <li key={v.id} className={`${styles.row} ${v.activo ? "" : styles.rowMuted}`}>
              <span className={styles.thumb} aria-hidden="true">
                {v.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniatura del catálogo
                  <img src={v.imagen} alt="" width={44} height={59} loading="lazy" />
                ) : (
                  <BottlePlaceholder kind={v.tipo === "espumoso" ? "sparkling" : "still"} label="" />
                )}
              </span>
              <div className={styles.body}>
                <Link href={`/admin/catalogo/vinos/${v.id}`} className={styles.name}>
                  {v.nombre}
                </Link>
                <p className={styles.meta}>
                  {v.productor} · {v.grupo}
                  {editable && aliados.length > 1 ? ` · ${v.aliado}` : ""}
                  {!v.activo && <span className={styles.hidden}> · Oculto en la tienda</span>}
                </p>
              </div>
              {v.precioCentavos === null ? (
                // Rol Aliado: solo su precio acordado.
                <p className={styles.price}>
                  {v.precioAliadoCentavos !== null ? pesos(v.precioAliadoCentavos) : "—"}
                  <span>tu precio por botella</span>
                </p>
              ) : (
                <p className={styles.price}>
                  {v.precioAntesCentavos && v.precioAntesCentavos > v.precioCentavos && (
                    <s className={styles.priceBefore}>
                      <span className="vv-sr-only">Antes </span>
                      {pesos(v.precioAntesCentavos)}
                    </s>
                  )}
                  {pesos(v.precioCentavos)}
                  <span>
                    {v.precioAliadoCentavos !== null
                      ? `acordado ${pesos(v.precioAliadoCentavos)} · margen ${Math.round(((v.precioCentavos - v.precioAliadoCentavos) * 100) / v.precioCentavos)} %`
                      : editable
                        ? "por botella · sin precio acordado"
                        : "por botella"}
                  </span>
                </p>
              )}
              <Existencias
                id={v.id}
                nombre={v.nombre}
                existencias={v.existencias}
                apartadas={v.apartadas}
                editable={inventario}
                onCambio={(n) => setVivas((x) => ({ ...x, [v.id]: n }))}
              />
              <Link href={`/admin/catalogo/vinos/${v.id}`} className={styles.edit}>
                {editable ? "Editar" : "Ver"}
                <span className="vv-sr-only"> {v.nombre}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
