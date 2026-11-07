import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Landing } from "@/app/_waitlist/Landing";

// Vista previa de la landing de la lista en dev (ahí "/" muestra la tienda). /lista?fase=cerrada la muestra como se
// verá después del cierre del registro. En producción no existe: el gate la oculta y aquí también se descarta.
export const metadata: Metadata = { title: "Vista previa: lista de espera · Viviendo Vino", robots: { index: false, follow: false } };

async function ConFase({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <Landing simular={sp.fase === "cerrada" ? "cerrada" : null} />;
}

export default function ListaPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NEXT_PUBLIC_PREVIEW !== "true" && process.env.VERCEL_ENV === "production") notFound();
  return (
    <Suspense fallback={<Landing />}>
      <ConFase searchParams={searchParams} />
    </Suspense>
  );
}
