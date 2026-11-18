"use client";
import { useEffect } from "react";
import { guardarCodigo } from "@/lib/cart/codigo";

/** Deja el código guardado en el navegador para que el checkout lo aplique solo. No pinta nada. */
export function AplicarCodigo({ codigo }: { codigo: string }) {
  useEffect(() => {
    guardarCodigo(codigo);
  }, [codigo]);
  return null;
}
