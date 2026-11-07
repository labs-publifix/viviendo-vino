"use client";

import { LAUNCH_AT_MS, SIGNUP_CLOSE_MS, launch, signupClose } from "@/lib/launch";
import styles from "./waitlist.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

function parts(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return { d: pad(Math.floor(mins / 1440)), h: pad(Math.floor((mins % 1440) / 60)), m: pad(mins % 60) };
}

// Mientras la lista está abierta, la cuenta va al cierre del registro (lunes 16, 11:59 pm); después, a la apertura.
// En servidor se pinta un estado neutro ("--"); la cuenta se calcula al montar en el cliente.
export function Countdown({ now, abierta }: { now: number | null; abierta: boolean }) {
  const target = abierta ? SIGNUP_CLOSE_MS : LAUNCH_AT_MS;
  const t = now === null ? { d: "--", h: "--", m: "--" } : parts(target - now);
  const etiqueta = abierta ? "La lista cierra en" : "Abrimos en";

  return (
    <div className={styles.countWrap}>
      <p className={styles.countLabel}>{etiqueta}</p>
      <div className={styles.count} role="timer" aria-label={abierta ? "Cuenta regresiva para el cierre de la lista" : "Cuenta regresiva para la apertura"} aria-live="off">
        <div className={styles.unit}><div className={styles.num}>{t.d}</div><div className={styles.lab}>Días</div></div>
        <div className={styles.unit}><div className={styles.num}>{t.h}</div><div className={styles.lab}>Horas</div></div>
        <div className={styles.unit}><div className={styles.num}>{t.m}</div><div className={styles.lab}>Minutos</div></div>
      </div>
      <p className={styles.when}>
        {abierta ? (
          <>
            Registro hasta el {signupClose.day}, {signupClose.time}. <strong>Abrimos el {launch.day} a las {launch.time}</strong> (hora centro de México).
          </>
        ) : (
          <>
            {launch.day.charAt(0).toUpperCase() + launch.day.slice(1)} · {launch.time}, hora centro de México.
          </>
        )}
      </p>
    </div>
  );
}
