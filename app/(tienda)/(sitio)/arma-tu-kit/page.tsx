import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { getCatalog } from "@/lib/catalog/repo";
import { Armador } from "./Armador";

export const metadata: Metadata = {
  title: "Arma tu kit · Viviendo Vino",
  description: "Elige 6 botellas de vino italiano del mismo grupo. El envío va incluido en el precio.",
};

export default async function ArmaTuKit() {
  if (!storeEnabled()) notFound();
  const { wines, groups, kits } = await getCatalog();
  return <Armador wines={wines} groups={groups} presets={kits} />;
}
