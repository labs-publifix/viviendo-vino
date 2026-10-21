"use client";

import { useEffect, useState } from "react";
import { GIFT_END_MS, LAUNCH_AT_MS, giftEnd, launch, phaseAt, type Phase } from "@/lib/launch";
import styles from "./waitlist.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

function parts(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return { d: pad(Math.floor(mins / 1440)), h: pad(Math.floor((mins % 1440) / 60)), m: pad(mins % 60) };
}

const COPY: Record<Phase, { lede: string; when: string; label: string }> = {
  before: {
    lede: `Abrimos el ${launch.day} a las ${launch.time}.`,
    when: `${launch.day} · ${launch.time}, hora centro de México`,
    label: "Cuenta regresiva para la apertura",
  },
  gift: {
    lede: "Ya abrimos.",
    when: `Tu regalo sorpresa sigue disponible hasta el ${giftEnd.day}, ${giftEnd.time} (hora centro de México).`,
    label: "Tiempo restante para el regalo sorpresa",
  },
  after: {
    lede: "La tienda ya está abierta.",
    when: "La ventana del regalo sorpresa cerró.",
    label: "La ventana del regalo sorpresa cerró",
  },
};

// En servidor se pinta un estado neutro ("--"); la cuenta se calcula al montar en el cliente.
export function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const phase: Phase = now === null ? "before" : phaseAt(now);
  const copy = COPY[phase];
  const target = phase === "before" ? LAUNCH_AT_MS : GIFT_END_MS;
  const t = now === null ? { d: "--", h: "--", m: "--" } : parts(target - now);

  return (
    <>
      <p className={styles.lede}>
        Kits de 6 botellas de vino, armados por ti. <span>{copy.lede}</span>
      </p>

      <div className={styles.count} role="timer" aria-label={copy.label} aria-live="off">
        <div className={styles.unit}><div className={styles.num}>{t.d}</div><div className={styles.lab}>Días</div></div>
        <div className={styles.unit}><div className={styles.num}>{t.h}</div><div className={styles.lab}>Horas</div></div>
        <div className={styles.unit}><div className={styles.num}>{t.m}</div><div className={styles.lab}>Minutos</div></div>
      </div>
      <p className={styles.when}>{copy.when}</p>
    </>
  );
}
