"use client";

import { useEffect } from "react";
import { guardarCodigo } from "@/lib/cart/codigo";

// Enlaces de campaña: viviendovino.com/?codigo=VERANO10 (o cualquier página de la tienda) guarda el código para
// aplicarlo en el checkout y lo quita de la dirección. No pinta nada.
export function CodigoCampana() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const codigo = url.searchParams.get("codigo");
    if (!codigo) return;
    guardarCodigo(codigo);
    url.searchParams.delete("codigo");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return null;
}
