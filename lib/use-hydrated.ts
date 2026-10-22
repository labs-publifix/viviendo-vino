import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false en el servidor y durante la hidratación; true después. Evita mostrar un carrito vacío falso. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
