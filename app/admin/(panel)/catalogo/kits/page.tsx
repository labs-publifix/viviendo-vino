import type { Metadata } from "next";
import { getCatalogoPanel } from "@/lib/admin/catalogo";
import { requireAdmin } from "@/lib/admin/session";
import { KitsManager } from "./KitsManager";

export const metadata: Metadata = { title: "Kits prearmados · Catálogo" };

export default async function Page() {
  const user = await requireAdmin(["admin"]);
  const { kits, vinos, grupos, aliados } = await getCatalogoPanel(user);
  return (
    <KitsManager
      kits={kits}
      vinos={vinos.map((v) => ({ id: v.id, nombre: v.nombre, grupoId: v.grupoId, aliadoId: v.aliadoId, precioCentavos: v.precioCentavos ?? 0, activo: v.activo, disponible: v.disponible }))}
      grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre, aliadoId: g.aliadoId }))}
      aliados={aliados}
    />
  );
}
