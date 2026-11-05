"use client";

import { useHydrated } from "@/lib/use-hydrated";

// Año del aviso de derechos. El HTML prerenderizado trae el año de respaldo; en el navegador se usa el año actual,
// así que cambia solo el 1 de enero sin volver a publicar.
const RESPALDO = 2026;

export function Anio() {
  const hydrated = useHydrated();
  return <>{hydrated ? new Date().getFullYear() : RESPALDO}</>;
}
