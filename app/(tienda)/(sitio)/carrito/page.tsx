import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog } from "@/lib/catalog/repo";
import { Carrito } from "./Carrito";

export const metadata: Metadata = {
  title: "Carrito · Viviendo Vino",
  robots: { index: false, follow: false },
};

export default async function CarritoPage() {
  if (!storeEnabled()) notFound();
  const { wines, kits } = await getCatalog();
  return (
    <Carrito
      wines={wines.map((w) => ({ slug: w.slug, name: w.name, group: w.group, priceCents: w.priceCents, compareAtCents: w.compareAtCents ?? null }))}
      presets={kits.map((k) => ({ slug: k.slug, name: k.name }))}
    />
  );
}
