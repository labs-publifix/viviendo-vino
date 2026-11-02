import type { Metadata } from "next";
import { getCatalogoPanel } from "@/lib/admin/catalogo";
import { requireAdmin } from "@/lib/admin/session";
import { VinosList } from "./VinosList";

export const metadata: Metadata = { title: "Vinos · Catálogo" };

export default async function Page({ searchParams }: PageProps<"/admin/catalogo/vinos">) {
  const user = await requireAdmin(["admin", "aliado", "atencion"]);
  const { vinos, grupos, aliados } = await getCatalogoPanel(user);
  const estado = (await searchParams).estado;
  return (
    <VinosList
      editable={user.rol === "admin"}
      inventario={user.rol !== "atencion"}
      filtroInicial={typeof estado === "string" ? estado : ""}
      vinos={vinos.map((v) => ({ id: v.id, nombre: v.nombre, productor: v.productor, anada: v.anada, grupoId: v.grupoId, grupo: v.grupo, aliadoId: v.aliadoId, aliado: v.aliado, precioCentavos: v.precioCentavos, precioAntesCentavos: v.precioAntesCentavos, precioAliadoCentavos: v.precioAliadoCentavos, imagen: v.imagen, existencias: v.existencias, apartadas: v.apartadas, activo: v.activo, tipo: v.tipo }))}
      grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre }))}
      aliados={aliados}
    />
  );
}
