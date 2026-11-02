"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import type { Movimiento } from "@/lib/admin/catalogo";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { MOTIVO_LABEL, MOTIVOS_AJUSTE, UMBRAL_POCAS } from "@/lib/inventario/rules";
import { fijarExistencias, type ExistenciasState } from "../inventario-actions";
import styles from "../catalogo.module.css";
import { Select } from "../../_ui/Select";
import { Existencias } from "./Existencias";

// Inventario en la ficha del vino: − / + (se guarda solo), "Fijar en…" para el conteo físico y el historial de
// movimientos. Puede vivir dentro del formulario del vino, así que no usa <form> propio: sus campos no tienen
// name (no viajan con "Guardar cambios") y Enter fija el número en lugar de enviar el formulario del vino.

export function InventarioPanel({
  id,
  nombre,
  existencias,
  apartadas,
  editable,
  movimientos,
}: {
  id: string;
  nombre: string;
  existencias: number;
  apartadas: number;
  editable: boolean;
  movimientos: Movimiento[];
}) {
  const [actual, setActual] = useState(existencias);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState<string>("conteo");
  const [nota, setNota] = useState("");
  const [state, setState] = useState<ExistenciasState>({});
  const [pending, start] = useTransition();

  const fijar = () => {
    const f = new FormData();
    f.set("id", id);
    f.set("valor", valor);
    f.set("motivo", motivo);
    f.set("nota", nota);
    f.set("esperado", String(actual));
    start(async () => {
      const r = await fijarExistencias({}, f);
      setState(r);
      if (typeof r.existencias === "number") setActual(r.existencias);
      if (r.ok) {
        setValor("");
        setNota("");
      }
    });
  };
  const enter = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    fijar();
  };
  const disponibles = Math.max(0, actual - apartadas);

  return (
    <section className={styles.card} aria-labelledby="inventario-titulo">
      <h3 id="inventario-titulo">Inventario</h3>
      <Existencias key={actual} id={id} nombre={nombre} existencias={actual} apartadas={apartadas} editable={editable} grande onCambio={setActual} />
      <p className={styles.hint}>
        {apartadas > 0
          ? `${disponibles} para vender · ${apartadas} ${apartadas === 1 ? "apartada" : "apartadas"} en pagos en curso (se liberan solas si el pago no llega en 30 minutos).`
          : `Con ${UMBRAL_POCAS} o menos avisamos por correo; en 0 la tienda lo muestra agotado.`}
      </p>

      {editable && (
        <div className={styles.fijar}>
          <p className={styles.fijarTitulo}>¿Contaste las botellas? Fija el número exacto</p>
          {state.error && <Notice kind="error">{state.error}</Notice>}
          {state.ok && state.message && <Notice kind="ok">{state.message}</Notice>}
          <div className={styles.inline}>
            <TextField label="Botellas" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={enter} error={state.errors?.valor} autoComplete="off" />
            <Select label="Motivo" value={motivo} onChange={setMotivo} error={state.errors?.motivo} options={MOTIVOS_AJUSTE.map((m) => ({ value: m, label: MOTIVO_LABEL[m] }))} />
          </div>
          <TextField label="Nota" optional value={nota} onChange={(e) => setNota(e.target.value)} onKeyDown={enter} error={state.errors?.nota} maxLength={200} autoComplete="off" />
          <Button type="button" variant="secondary" onClick={fijar} loading={pending} disabled={valor.trim() === ""}>
            Fijar existencias
          </Button>
        </div>
      )}

      <div>
        <p className={styles.fijarTitulo}>Movimientos recientes</p>
        {movimientos.length === 0 ? (
          <p className={styles.hint}>Todavía no hay movimientos.</p>
        ) : (
          <ol className={styles.movs}>
            {movimientos.map((m) => (
              <li key={m.id}>
                <span className={styles.movCambio} data-signo={m.cambio > 0 ? "mas" : "menos"}>
                  {m.cambio > 0 ? `+${m.cambio}` : `−${Math.abs(m.cambio)}`}
                </span>
                <span className={styles.movTexto}>
                  <b>{MOTIVO_LABEL[m.motivo] ?? m.motivo}</b>
                  {m.pedidoId && (
                    <>
                      {" · "}
                      <a href={`/admin/pedidos/${m.pedidoId}`}>ver pedido</a>
                    </>
                  )}
                  {m.nota && ` · ${m.nota}`}
                  <small>
                    {fechaCdmx(m.at)}
                    {m.quien ? ` · ${m.quien}` : ""} · quedaron {m.existencias}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
