"use client";

import { useEffect } from "react";
import { evento } from "@/lib/analytics";

// Cuenta los clics a WhatsApp, a llamar y al correo en todo el sitio, sin tocar cada botón. Solo se monta con GA4.
export function ClicsContacto() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const ubicacion = a.closest("footer") ? "pie" : a.closest("header") ? "encabezado" : window.location.pathname;
      if (href.startsWith("https://wa.me/")) evento("contact_whatsapp", { ubicacion });
      else if (href.startsWith("tel:")) evento("contact_phone", { ubicacion });
      else if (href.startsWith("mailto:")) evento("contact_email", { ubicacion });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
