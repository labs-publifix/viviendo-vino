import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog } from "@/lib/catalog/repo";
import { Armador } from "./Armador";

export const metadata: Metadata = seo({
  titulo: "Arma tu kit de 6 botellas de vino · Viviendo Vino",
  descripcion: "Elige 6 botellas de vino italiano del mismo grupo y mézclalas como quieras. El precio ya incluye el envío a todo México.",
  ruta: "/arma-tu-kit",
});

export default async function ArmaTuKit() {
  if (!storeEnabled()) notFound();
  const { wines, groups, kits } = await getCatalog();
  return <Armador wines={wines} groups={groups} presets={kits} />;
}
