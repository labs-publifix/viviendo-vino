import { useEffect, useState } from "react";
import type { KitValidation, StockIssue } from "@/lib/kit/rules";
import { leerApartado } from "./apartado";
import type { CartKit } from "./store";

// Pide al servidor que revise el carrito (reglas del kit, precios de la base y existencias del momento) cada vez que
// cambia y cada vez que se abre: así, al volver a un carrito guardado, se confirma que las botellas siguen ahí.

export type ValidatedKit = { id?: string; groupName?: string } & KitValidation;
export type CartValidation = {
  status: "idle" | "loading" | "done" | "error";
  kits: ValidatedKit[];
  totalCents: number;
  /** Vinos que el carrito pide en más botellas de las que hay (sumando todos los kits). */
  stockIssues: StockIssue[];
  error?: string;
};

/** El apartado de este navegador (si hay), para que sus botellas cuenten como suyas. */
function apartadoPrevio() {
  const a = leerApartado();
  return a ? { id: a.id, token: a.token } : undefined;
}

export function useCartValidation(kits: CartKit[], enabled: boolean): CartValidation {
  const [validation, setValidation] = useState<CartValidation>({ status: "idle", kits: [], totalCents: 0, stockIssues: [] });
  const key = JSON.stringify(kits.map((k) => [k.id, k.items]));

  useEffect(() => {
    if (!enabled || kits.length === 0) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refleja la petición al servidor en curso
    setValidation((v) => ({ ...v, status: "loading" }));
    fetch("/api/carrito/validar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kits: kits.map((k) => ({ id: k.id, items: k.items })), previo: apartadoPrevio() }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.kits)) throw new Error(data?.error ?? "No pudimos revisar tu carrito.");
        setValidation({ status: "done", kits: data.kits, totalCents: data.totalCents, stockIssues: Array.isArray(data.stockIssues) ? data.stockIssues : [] });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setValidation({ status: "error", kits: [], totalCents: 0, stockIssues: [], error: e instanceof Error ? e.message : "No pudimos revisar tu carrito." });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` resume el contenido del carrito
  }, [enabled, key]);

  return validation;
}
