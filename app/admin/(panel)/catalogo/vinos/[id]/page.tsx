import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BottlePlaceholder } from "@/app/_ui/BottlePlaceholder";
import { Icon } from "@/app/_ui/Icon";
import { getCatalogoPanel, getMovimientos } from "@/lib/admin/catalogo";
import { requireAdmin } from "@/lib/admin/session";
import { puedeAjustarInventario } from "@/lib/inventario/rules";
import styles from "../../catalogo.module.css";
import { InventarioPanel } from "../InventarioPanel";
import { VinoForm } from "../VinoForm";

export const metadata: Metadata = { title: "Vino · Catálogo" };

// Ficha de un vino. Admin: todo el formulario con el inventario al lado. Aliado (solo sus vinos) y atención: el
// inventario; el aliado lo puede cambiar, atención solo lo consulta.
export default async function Page({ params }: PageProps<"/admin/catalogo/vinos/[id]">) {
  const user = await requireAdmin(["admin", "aliado", "atencion"]);
  const { id } = await params;
  const { vinos, grupos, categorias, aliados } = await getCatalogoPanel(user);
  const w = vinos.find((x) => x.id === id);
  if (!w) notFound();
  const movimientos = await getMovimientos(w.id);
  const inventario = (
    <InventarioPanel
      id={w.id}
      nombre={w.nombre}
      existencias={w.existencias}
      apartadas={w.apartadas}
      editable={puedeAjustarInventario(user, { aliadoId: w.aliadoId })}
      movimientos={movimientos}
    />
  );

  if (user.rol !== "admin") {
    return (
      <div className={styles.form}>
        <div className={styles.formHead}>
          <Link href="/admin/catalogo/vinos" className={styles.back}>
            <Icon name="arrow" size={16} /> Vinos
          </Link>
          <h2 className={styles.formTitle}>{w.nombre}</h2>
          <p className={styles.hint}>
            {w.productor} · {w.grupo}
          </p>
        </div>
        <div className={styles.fichaGrid}>
          <span className={styles.fichaFoto} aria-hidden="true">
            {w.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto del catálogo
              <img src={w.imagen} alt="" width={220} height={296} />
            ) : (
              <BottlePlaceholder kind={w.tipo === "espumoso" ? "sparkling" : "still"} label="" />
            )}
          </span>
          {inventario}
        </div>
      </div>
    );
  }

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
        precioAntesCentavos: w.precioAntesCentavos,
        precioAliadoCentavos: w.precioAliadoCentavos,
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
      inventario={inventario}
    />
  );
}
