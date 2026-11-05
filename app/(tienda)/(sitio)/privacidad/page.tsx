import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getLegal } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";
import { LegalPage } from "../_legal/LegalPage";

// Texto autorizado en content/legal/privacidad.md (no se edita aquí).
const doc = getLegal("privacidad");

export const metadata: Metadata = {
  title: doc.seo,
  description: doc.descripcion,
  alternates: { canonical: `${SITE_URL}/privacidad` },
};

export default function Privacidad() {
  if (!storeEnabled()) notFound();
  return <LegalPage doc={doc} />;
}
