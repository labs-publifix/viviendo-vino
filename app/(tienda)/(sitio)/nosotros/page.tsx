import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { Provisional } from "../_info/Provisional";

// Provisional: se reemplaza cuando se construya Nosotros.
export const metadata: Metadata = { title: "Nosotros · Viviendo Vino", robots: { index: false, follow: true } };

export default function Page() {
  if (!storeEnabled()) notFound();
  return <Provisional label="Nosotros" title="Conoce a quien está detrás de cada kit." text="Estamos preparando esta página. Muy pronto conocerás a Rafa y cómo elegimos cada botella." />;
}
