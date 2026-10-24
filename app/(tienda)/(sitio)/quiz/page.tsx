import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { Provisional } from "../_info/Provisional";

// Provisional: se reemplaza cuando se construya Quiz IA.
export const metadata: Metadata = { title: "Quiz IA · Viviendo Vino", robots: { index: false, follow: true } };

export default function Page() {
  if (!storeEnabled()) notFound();
  return <Provisional label="Quiz IA" title="¿No sabes cuál elegir? Te ayudamos." text="Estamos preparando el quiz. Muy pronto podrás usarlo aquí." />;
}
