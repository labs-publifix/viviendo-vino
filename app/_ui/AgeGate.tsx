"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import styles from "./AgeGate.module.css";

// Verificación de edad al entrar a la tienda (Manual · 10.05). La respuesta "sí" se recuerda 30 días.
// El script de AGE_GATE_SCRIPT marca <html data-edad="ok"> antes de pintar, así quien ya confirmó no ve
// el aviso ni un parpadeo. La verificación con fecha de nacimiento sigue en el checkout.

const KEY = "vv_mayor_edad";
const DAYS = 30;

/** Se inserta antes del aviso: oculta el aviso si ya hay confirmación vigente. */
export const AGE_GATE_SCRIPT = `try{var t=+localStorage.getItem("${KEY}");if(t&&Date.now()-t<${DAYS}*864e5)document.documentElement.dataset.edad="ok"}catch(e){}`;

export function AgeGate() {
  const [answer, setAnswer] = useState<"pending" | "no">("pending");
  const [hidden, setHidden] = useState(false);
  const yesRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Si el aviso está a la vista, recibe el foco y no deja tabular fuera de él.
  useEffect(() => {
    if (document.documentElement.dataset.edad === "ok") return;
    yesRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]");
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [answer]);

  function confirm() {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // Sin almacenamiento: vale para esta visita.
    }
    document.documentElement.dataset.edad = "ok";
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className={styles.gate} data-age-gate>
      <div ref={dialogRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="edad-title" aria-describedby="edad-desc">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo */}
        <img src="/brand/logo-fondo-oscuro.svg" alt="Viviendo Vino" width={786} height={250} className={styles.logo} />

        {answer === "pending" ? (
          <>
            <p className={styles.label}>Solo para mayores de edad</p>
            <h2 id="edad-title" className={styles.title}>
              ¿Tienes 18 años <em>o más?</em>
            </h2>
            <p id="edad-desc" className={styles.text}>
              Para entrar a la tienda confirma tu edad. En México la venta de alcohol es solo para mayores de 18 años.
            </p>
            <div className={styles.actions}>
              <Button ref={yesRef} tone="dark" size="lg" onClick={confirm}>
                Sí, tengo 18 o más
              </Button>
              <Button variant="secondary" tone="dark" size="lg" onClick={() => setAnswer("no")}>
                No
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.label}>Te esperamos</p>
            <h2 id="edad-title" className={styles.title}>
              Vuelve cuando cumplas <em>18.</em>
            </h2>
            <p id="edad-desc" className={styles.text}>
              Gracias por tu honestidad. Aquí te esperamos.
            </p>
            <div className={styles.actions}>
              <Button variant="secondary" tone="dark" size="lg" onClick={() => setAnswer("pending")}>
                Me equivoqué
              </Button>
            </div>
          </>
        )}

        <p className={styles.fine}>Evita el exceso.</p>
      </div>
    </div>
  );
}
