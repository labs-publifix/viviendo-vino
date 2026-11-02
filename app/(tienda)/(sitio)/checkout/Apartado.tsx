"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { APARTADO_MINUTOS, cuentaRegresiva } from "@/lib/inventario/rules";
import styles from "./checkout.module.css";

// Cuenta regresiva del apartado. El tiempo lo marca el servidor: `desfase` corrige el reloj del teléfono, así que
// cambiar la hora o recargar no lo altera. En los últimos 5 minutos cambia a tono de aviso. El lector de pantalla
// no escucha cada segundo: solo a los 5 minutos, al último minuto y al vencer.

const URGENTE_MS = 5 * 60_000;
const TOTAL_MS = APARTADO_MINUTOS * 60_000;

export type ApartadoVista = { expiraAt: string | null; desfase: number; renovaciones: number; maxRenovaciones: number; limite: boolean };

function restante(a: ApartadoVista) {
  return a.expiraAt ? Date.parse(a.expiraAt) - (Date.now() + a.desfase) : 0;
}

export function Apartado({
  apartado,
  compacto = false,
  renovando,
  onRenovar,
  onVencio,
}: {
  apartado: ApartadoVista;
  compacto?: boolean;
  renovando?: boolean;
  onRenovar?: () => void;
  onVencio?: () => void;
}) {
  const [ms, setMs] = useState(() => restante(apartado));
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let ultimo = restante(apartado);
    const tick = () => {
      const r = restante(apartado);
      setMs(r);
      // Avisos para lector de pantalla solo al cruzar estos momentos.
      if (ultimo > URGENTE_MS && r <= URGENTE_MS && r > 0) setAviso("Te quedan 5 minutos para terminar tu compra.");
      if (ultimo > 60_000 && r <= 60_000 && r > 0) setAviso("Te queda 1 minuto para terminar tu compra.");
      if (ultimo > 0 && r <= 0) {
        setAviso("Tu apartado venció. Tu carrito sigue guardado.");
        onVencio?.();
      }
      ultimo = r;
    };
    tick();
    const t = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [apartado, onVencio]);

  if (apartado.limite) {
    return (
      <section className={styles.apartado} data-estado="limite" aria-labelledby="apartado-titulo">
        <p className={styles.apartadoEyebrow}>
          <Icon name="clock" size={16} /> Sin apartado
        </p>
        <h2 id="apartado-titulo" className={styles.apartadoTitulo}>
          Ya no podemos apartar más tiempo
        </h2>
        <p className={styles.apartadoTexto}>
          Renovaste tu apartado {apartado.maxRenovaciones} veces. Puedes pagar mientras sigan las botellas, pero ya no las apartamos para ti.
        </p>
      </section>
    );
  }

  const vencido = ms <= 0;
  const urgente = !vencido && ms <= URGENTE_MS;
  const tiempo = cuentaRegresiva(ms);
  const pct = Math.max(0, Math.min(100, (ms / TOTAL_MS) * 100));

  if (vencido) {
    return (
      <section className={styles.apartado} data-estado="vencido" aria-labelledby="apartado-titulo">
        <span className="vv-sr-only" aria-live="polite">
          {aviso}
        </span>
        <p className={styles.apartadoEyebrow}>
          <Icon name="clock" size={16} /> Apartado vencido
        </p>
        <h2 id="apartado-titulo" className={styles.apartadoTitulo}>
          Se acabó el tiempo de tu apartado
        </h2>
        <p className={styles.apartadoTexto}>
          Tu carrito sigue guardado. Confirmamos que las botellas sigan disponibles y te las apartamos otros {APARTADO_MINUTOS} minutos.
        </p>
        {onRenovar && (
          <Button type="button" onClick={onRenovar} loading={renovando} block>
            Confirmar existencias y apartar de nuevo
          </Button>
        )}
        {apartado.renovaciones > 0 && (
          <p className={styles.apartadoNota}>
            Renovaciones: {apartado.renovaciones} de {apartado.maxRenovaciones}.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className={`${styles.apartado} ${compacto ? styles.apartadoCompacto : ""}`} data-estado={urgente ? "urgente" : "activo"} aria-labelledby="apartado-titulo">
      <span className="vv-sr-only" aria-live="polite">
        {aviso}
      </span>
      <div className={styles.apartadoFila}>
        <div>
          <p className={styles.apartadoEyebrow}>
            <Icon name="clock" size={16} /> Botellas apartadas
          </p>
          <h2 id="apartado-titulo" className={styles.apartadoTitulo}>
            {urgente ? "Termina tu compra para no perder tu apartado" : "Tus botellas están apartadas"}
          </h2>
        </div>
        <p className={styles.reloj} aria-hidden="true">
          {tiempo}
        </p>
      </div>
      <div className={styles.barra} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className={styles.apartadoTexto}>
        Te quedan <strong>{tiempo}</strong> para terminar tu compra.
        {!compacto && " Si el tiempo se acaba, tu carrito se queda guardado y solo confirmamos existencias de nuevo."}
      </p>
    </section>
  );
}
