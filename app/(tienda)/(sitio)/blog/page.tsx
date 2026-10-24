import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { Provisional } from "../_info/Provisional";

// Provisional: se reemplaza cuando se construya Blog y guías.
export const metadata: Metadata = { title: "Blog y guías · Viviendo Vino", robots: { index: false, follow: true } };

export default function Page() {
  if (!storeEnabled()) notFound();
  return (
    <Provisional label="Blog y guías" title="Aprende de vino sin complicarte." text="Estamos preparando los artículos y las guías en PDF. Muy pronto los encontrarás aquí.">
      {/* Destino de "Ver guías en PDF" (/blog#guias). */}
      <span id="guias" />
    </Provisional>
  );
}
