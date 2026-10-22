import { useSyncExternalStore } from "react";
import { MAX_KITS, type KitItem } from "@/lib/kit/rules";

// Carrito y kit en curso, guardados en el navegador (localStorage). Si el navegador no deja guardar
// (modo privado, almacenamiento lleno o bloqueado), siguen en memoria mientras la pestaña esté abierta.
// Aquí solo viven slugs y cantidades: los precios siempre los pone el servidor.

export type CartKit = { id: string; items: KitItem[]; preset?: string };
export type Draft = { items: KitItem[]; editing?: string; preset?: string };
type State = { kits: CartKit[]; draft: Draft };

const KEY = "vv_carrito_v1";
const EMPTY: State = { kits: [], draft: { items: [] } };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isItems(v: unknown): v is KitItem[] {
  return (
    Array.isArray(v) &&
    v.every((i) => i && typeof i.slug === "string" && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 6)
  );
}

function parse(raw: string | null): State {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw);
    const kits = Array.isArray(data?.kits)
      ? data.kits
          .filter((k: CartKit) => k && typeof k.id === "string" && isItems(k.items))
          .slice(0, MAX_KITS)
          .map((k: CartKit) => ({ id: k.id, items: k.items, ...(typeof k.preset === "string" ? { preset: k.preset } : {}) }))
      : [];
    const d = data?.draft;
    const draft: Draft = d && isItems(d.items)
      ? {
          items: d.items,
          ...(typeof d.editing === "string" ? { editing: d.editing } : {}),
          ...(typeof d.preset === "string" ? { preset: d.preset } : {}),
        }
      : { items: [] };
    return { kits, draft };
  } catch {
    return EMPTY;
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = parse(window.localStorage.getItem(KEY));
  } catch {
    state = EMPTY;
  }
}

function save(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento: el estado sigue en memoria.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  // Otra pestaña cambió el carrito.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = parse(e.newValue);
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}
const getServerSnapshot = () => EMPTY;

/** Estado del carrito; en el servidor y en el primer render es el carrito vacío. */
export function useCart(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export const cart = {
  getState(): State {
    return getSnapshot();
  },
  setDraft(draft: Draft) {
    save({ ...getSnapshot(), draft });
  },
  /** Vacía el kit en curso; si se estaba editando un kit del carrito, se sigue editando ese. */
  clearDraft() {
    const s = getSnapshot();
    save({ ...s, draft: { items: [], ...(s.draft.editing ? { editing: s.draft.editing } : {}) } });
  },
  /** Deja de editar: el kit del carrito queda como estaba y el armador vuelve a vacío. */
  cancelEdit() {
    save({ ...getSnapshot(), draft: { items: [] } });
  },
  /** Guarda el kit en curso en el carrito (nuevo o reemplazando el que se editaba) y vacía el armador. */
  commitDraft(): { ok: true } | { ok: false; reason: "max-kits" } {
    const s = getSnapshot();
    const { items, editing, preset } = s.draft;
    const kit: CartKit = { id: editing ?? newId(), items, ...(preset ? { preset } : {}) };
    const exists = editing && s.kits.some((k) => k.id === editing);
    if (!exists && s.kits.length >= MAX_KITS) return { ok: false, reason: "max-kits" };
    const kits = exists ? s.kits.map((k) => (k.id === editing ? kit : k)) : [...s.kits, kit];
    save({ kits, draft: { items: [] } });
    return { ok: true };
  },
  removeKit(id: string) {
    const s = getSnapshot();
    save({ ...s, kits: s.kits.filter((k) => k.id !== id) });
  },
  duplicateKit(id: string): boolean {
    const s = getSnapshot();
    const kit = s.kits.find((k) => k.id === id);
    if (!kit || s.kits.length >= MAX_KITS) return false;
    save({ ...s, kits: [...s.kits, { ...kit, id: newId() }] });
    return true;
  },
  /** Carga un kit del carrito en el armador para editarlo. */
  editKit(id: string): boolean {
    const s = getSnapshot();
    const kit = s.kits.find((k) => k.id === id);
    if (!kit) return false;
    save({ ...s, draft: { items: kit.items, editing: kit.id } });
    return true;
  },
};
