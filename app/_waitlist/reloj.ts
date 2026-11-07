"use client";

import { useEffect, useState } from "react";
import { SIGNUP_CLOSE_MS } from "@/lib/launch";

/** En el preview (/lista?fase=cerrada) se puede ver la landing como se verá después del cierre del registro. */
export type Simulacion = "cerrada" | null;

/**
 * Hora actual, cada segundo. En el servidor y antes de hidratar es null (se pinta el estado de registro abierto).
 * Con simulación "cerrada", el reloj corre desde una hora después del cierre.
 */
export function useAhora(simular: Simulacion = null): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const offset = simular === "cerrada" ? SIGNUP_CLOSE_MS + 3600 * 1000 - Date.now() : 0;
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [simular]);
  return now;
}
