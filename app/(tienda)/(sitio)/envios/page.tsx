import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getLegal } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";
import { LegalPage } from "../_legal/LegalPage";

// Texto autorizado en content/legal/envios.md (no se edita aquí).
const doc = getLegal("envios");

export const metadata: Metadata = {
  title: doc.seo,
  description: doc.descripcion,
  alternates: { canonical: `${SITE_URL}/envios` },
};

export default function Envios() {
  if (!storeEnabled()) notFound();
  return <LegalPage doc={doc} />;
}
