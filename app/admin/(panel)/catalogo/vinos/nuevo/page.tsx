import type { Metadata } from "next";
import { getCatalogoPanel } from "@/lib/admin/catalogo";
import { requireAdmin } from "@/lib/admin/session";
import { VinoForm } from "../VinoForm";

export const metadata: Metadata = { title: "Agregar vino · Catálogo" };

export default async function Page() {
  const user = await requireAdmin(["admin"]);
  const { grupos, categorias, aliados } = await getCatalogoPanel(user);
  return (
    <VinoForm
      // Por defecto, el primer aliado que ya tiene grupos (al que sí se le pueden cargar vinos).
      vino={{ aliadoId: (aliados.find((a) => grupos.some((g) => g.aliadoId === a.id)) ?? aliados[0])?.id ?? "", nombre_oficial: "", productor: "", categoria_slug: "", grupo_id: "", tipo: "", uva: "", region: "", denominacion: "", anada: "", volumen_ml: "750", grado_alcohol: "", precioCentavos: null, premio: "", descripcion: "", descripcion_aliado: "", imagen: null, activo: true, kits: [] }}
      categorias={categorias}
      grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre, aliadoId: g.aliadoId }))}
      aliados={aliados}
    />
  );
}
