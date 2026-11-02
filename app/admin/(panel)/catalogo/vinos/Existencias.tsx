"use client";

import { useEffect, useRef, useState } from "react";
import { estadoInventario, ESTADO_INVENTARIO_LABEL, EXISTENCIAS_MAX } from "@/lib/inventario/rules";
import { ajustarExistencias } from "../inventario-actions";
import styles from "../catalogo.module.css";

// Existencias de un vino con − / +. Cada clic suma al momento en pantalla y, tras una pausa corta, los clics
// seguidos se guardan juntos como un solo movimiento (p. ej. "+3"). Si el servidor rechaza el cambio, el número
// vuelve al último guardado y se explica por qué. Sin permiso (atención), solo muestra el número.

const PAUSA_MS = 700;

export function Existencias({
  id,
  nombre,
  existencias,
  apartadas,
  editable,
  grande = false,
  onCambio,
}: {
  id: string;
  nombre: string;
  existencias: number;
  apartadas: number;
  editable: boolean;
  grande?: boolean;
  onCambio?: (existencias: number) => void;
}) {
  const [guardado, setGuardado] = useState(existencias);
  const [pendiente, setPendiente] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cola = useRef(0);
  const ocupado = useRef(false);

  // Si el servidor trae otro número (otra persona lo cambió y se recargó la página), se toma ese.
  const [previo, setPrevio] = useState(existencias);
  if (existencias !== previo) {
    setPrevio(existencias);
    if (pendiente === 0 && !enviando) setGuardado(existencias);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const valor = guardado + pendiente;
  const estado = estadoInventario(valor);

  async function enviar() {
    if (ocupado.current || cola.current === 0) return;
    ocupado.current = true;
    const cambio = cola.current;
    cola.current = 0;
    setEnviando(true);
    const r = await ajustarExistencias(id, cambio);
    ocupado.current = false;
    setEnviando(false);
    if (r.ok && typeof r.existencias === "number") {
      setGuardado(r.existencias);
      setPendiente(cola.current);
      setError(null);
      onCambio?.(r.existencias);
    } else {
      cola.current = 0;
      setPendiente(0);
      if (typeof r.existencias === "number") setGuardado(r.existencias);
      setError(r.error ?? "No se pudo guardar. Intenta otra vez.");
    }
    if (cola.current !== 0) programar();
  }

  function programar() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(enviar, PAUSA_MS);
  }

  function mover(d: 1 | -1) {
    if (valor + d < 0 || valor + d > EXISTENCIAS_MAX) return;
    setError(null);
    cola.current += d;
    setPendiente((p) => p + d);
    programar();
  }

  return (
    <div className={`${styles.stock} ${grande ? styles.stockGrande : ""}`} data-estado={estado}>
      {editable ? (
        <div className={styles.stepper} role="group" aria-label={`Existencias de ${nombre}`}>
          <button type="button" onClick={() => mover(-1)} disabled={valor <= 0} aria-label={`Quitar una botella de ${nombre}`}>
            <span aria-hidden="true">−</span>
          </button>
          <output aria-live="polite" aria-label={`${valor} ${valor === 1 ? "botella" : "botellas"}`}>{valor}</output>
          <button type="button" onClick={() => mover(1)} aria-label={`Sumar una botella de ${nombre}`}>
            <span aria-hidden="true">+</span>
          </button>
        </div>
      ) : (
        <p className={styles.stockValor}>
          {valor} <span>{valor === 1 ? "botella" : "botellas"}</span>
        </p>
      )}
      <p className={styles.stockNota}>
        {estado !== "ok" && <span className={styles.stockBadge}>{ESTADO_INVENTARIO_LABEL[estado]}</span>}
        {enviando || pendiente !== 0 ? (
          <span>Guardando…</span>
        ) : apartadas > 0 ? (
          <span title="Botellas en pagos en curso: siguen en bodega, pero nadie más las puede comprar.">
            {apartadas} {apartadas === 1 ? "apartada" : "apartadas"}
          </span>
        ) : null}
      </p>
      {error && (
        <p className={styles.stockError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
