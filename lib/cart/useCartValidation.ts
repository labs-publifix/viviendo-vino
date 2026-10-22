import { useEffect, useState } from "react";
import type { KitValidation } from "@/lib/kit/rules";
import type { CartKit } from "./store";

// Pide al servidor que revise el carrito (reglas del kit y precios de la base) cada vez que cambia.

export type ValidatedKit = { id?: string; groupName?: string } & KitValidation;
export type CartValidation = {
  status: "idle" | "loading" | "done" | "error";
  kits: ValidatedKit[];
  totalCents: number;
  error?: string;
};

export function useCartValidation(kits: CartKit[], enabled: boolean): CartValidation {
  const [validation, setValidation] = useState<CartValidation>({ status: "idle", kits: [], totalCents: 0 });
  const key = JSON.stringify(kits.map((k) => [k.id, k.items]));

  useEffect(() => {
    if (!enabled || kits.length === 0) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refleja la petición al servidor en curso
    setValidation((v) => ({ ...v, status: "loading" }));
    fetch("/api/carrito/validar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kits: kits.map((k) => ({ id: k.id, items: k.items })) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.kits)) throw new Error(data?.error ?? "No pudimos revisar tu carrito.");
        setValidation({ status: "done", kits: data.kits, totalCents: data.totalCents });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setValidation({ status: "error", kits: [], totalCents: 0, error: e instanceof Error ? e.message : "No pudimos revisar tu carrito." });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` resume el contenido del carrito
  }, [enabled, key]);

  return validation;
}
