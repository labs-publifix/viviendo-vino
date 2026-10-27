"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/_ui/Button";
import { Notice } from "@/app/_ui/Notice";
import { crearPedidoPrueba } from "./actions";

/** Crea un pedido de prueba (solo en dev) y abre su detalle. */
export function PruebaButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await crearPedidoPrueba();
            if (r?.error) setError(r.error);
          })
        }
      >
        Crear pedido de prueba
      </Button>
      {error && <Notice kind="error">{error}</Notice>}
    </>
  );
}
