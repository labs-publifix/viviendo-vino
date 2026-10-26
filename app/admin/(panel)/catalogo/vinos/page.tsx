import type { Metadata } from "next";
import { getCatalogoPanel } from "@/lib/admin/catalogo";
import { requireAdmin } from "@/lib/admin/session";
import { VinosList } from "./VinosList";

export const metadata: Metadata = { title: "Vinos · Catálogo" };

export default async function Page() {
  const user = await requireAdmin(["admin", "aliado"]);
  const { vinos, grupos, aliados } = await getCatalogoPanel(user);
  return (
    <VinosList
      editable={user.rol === "admin"}
      vinos={vinos.map((v) => ({ id: v.id, nombre: v.nombre, productor: v.productor, anada: v.anada, grupoId: v.grupoId, grupo: v.grupo, aliadoId: v.aliadoId, aliado: v.aliado, precioCentavos: v.precioCentavos, imagen: v.imagen, disponible: v.disponible, activo: v.activo, tipo: v.tipo }))}
      grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre }))}
      aliados={aliados}
    />
  );
}
