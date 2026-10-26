import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogoPanel } from "@/lib/admin/catalogo";
import { requireAdmin } from "@/lib/admin/session";
import { VinoForm } from "../VinoForm";

export const metadata: Metadata = { title: "Editar vino · Catálogo" };

export default async function Page({ params }: PageProps<"/admin/catalogo/vinos/[id]">) {
  const user = await requireAdmin(["admin"]);
  const { id } = await params;
  const { vinos, grupos, categorias, aliados } = await getCatalogoPanel(user);
  const w = vinos.find((x) => x.id === id);
  if (!w) notFound();
  return (
    <VinoForm
      key={w.id}
      vino={{
        id: w.id,
        slug: w.slug,
        aliadoId: w.aliadoId,
        nombre_oficial: w.nombre,
        productor: w.productor,
        categoria_slug: w.categoriaSlug,
        grupo_id: w.grupoId,
        tipo: w.tipo,
        uva: w.uva,
        region: w.region,
        denominacion: w.denominacion,
        anada: w.anada,
        volumen_ml: w.volumen,
        grado_alcohol: w.grado,
        precioCentavos: w.precioCentavos,
        premio: w.premio,
        descripcion: w.descripcion,
        descripcion_aliado: w.descripcionAliado,
        imagen: w.imagen,
        activo: w.activo,
        kits: w.kits,
      }}
      categorias={categorias}
      grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre, aliadoId: g.aliadoId }))}
      aliados={aliados}
    />
  );
}
