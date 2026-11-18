import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getLegal } from "@/lib/legal";
import { LegalPage } from "../_legal/LegalPage";

// Texto autorizado en content/legal/terminos.md (no se edita aquí).
const doc = getLegal("terminos");

export const metadata: Metadata = seo({ titulo: doc.seo, descripcion: doc.descripcion, ruta: "/terminos" });

export default function Terminos() {
  if (!storeEnabled()) notFound();
  return <LegalPage doc={doc} />;
}
