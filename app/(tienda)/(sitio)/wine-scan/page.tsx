import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { Provisional } from "../_info/Provisional";

// Provisional: se reemplaza cuando se construya Wine Scan.
export const metadata: Metadata = { title: "Wine Scan · Viviendo Vino", robots: { index: false, follow: true } };

export default function Page() {
  if (!storeEnabled()) notFound();
  return <Provisional label="Wine Scan" title="Fotografía la etiqueta. Entérate de todo." text="Estamos preparando el escáner de etiquetas. Muy pronto podrás usarlo aquí." />;
}
