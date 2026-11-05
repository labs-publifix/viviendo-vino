"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/app/_ui/Icon";
import styles from "./landing.module.css";

// Botones de escaneo de la landing (solo en la vista móvil). No abren la cámara por su cuenta: suben al inicio y
// tocan el botón "Escanear etiqueta" del escáner, que es el que tiene la lógica (cámara, galería, resultado). El
// toque sigue siendo del usuario, así que el navegador deja abrir la cámara.

function escanear() {
  const boton = document.querySelector<HTMLButtonElement>('[data-accion="escanear"]');
  window.scrollTo({ top: 0, behavior: "instant" });
  boton?.click();
}

export function BotonEscanear() {
  return (
    <button type="button" className={styles.ctaScan} onClick={escanear}>
      <Icon name="camera" size={22} /> Escanear etiqueta
    </button>
  );
}

/** Barra fija inferior: aparece al dejar atrás el escáner del hero y se oculta al volver a verlo o al llegar al cierre. */
export function BarraEscanear() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("ws-hero");
    const final = document.getElementById("ws-final");
    if (!hero || !final) return;
    // Se ve entre el hero y el cierre: no tapa el botón del cierre ni el pie de página. Se mide al desplazarse (una vez
    // por cuadro): un IntersectionObserver no avisa si un salto de scroll cruza el cierre de un lado al otro.
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      setVisible(hero.getBoundingClientRect().bottom < 0 && final.getBoundingClientRect().top > window.innerHeight);
    };
    const pedir = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
    };
  }, []);

  return (
    <div className={styles.sticky} data-visible={visible || undefined} aria-hidden={!visible || undefined} inert={!visible}>
      <button type="button" className={styles.ctaScan} onClick={escanear} tabIndex={visible ? undefined : -1}>
        <Icon name="camera" size={22} /> Escanear etiqueta
      </button>
    </div>
  );
}
