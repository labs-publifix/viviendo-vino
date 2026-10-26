import type { Metadata } from "next";
import { getCatalogoPanel } from "@/lib/admin/catalogo";
import { pesos } from "@/lib/admin/catalogo-rules";
import { requireAdmin } from "@/lib/admin/session";
import styles from "../catalogo.module.css";

export const metadata: Metadata = { title: "Grupos · Catálogo" };

// Grupos de compatibilidad (solo se mezclan en un kit los vinos del mismo grupo). Hoy se ven, pero no se editan:
// sus nombres viven también en el diseño de la tienda, y cambiarlos aquí la desalinearía.
export default async function Page() {
  const user = await requireAdmin(["admin"]);
  const { grupos, vinos, aliados } = await getCatalogoPanel(user);
  return (
    <div className={styles.wrap}>
      <p className={styles.lock}>
        Los grupos deciden qué vinos se pueden mezclar en un kit. Sus nombres y fotos también están en el diseño de la tienda, así que por ahora se ven aquí pero no se editan. Si necesitas un grupo nuevo o cambiar uno, pídelo y lo ajustamos junto con la tienda.
      </p>
      <ul className={styles.groups}>
        {grupos.map((g) => {
          const suyos = vinos.filter((v) => v.grupoId === g.id && v.activo);
          const precios = suyos.map((v) => v.precioCentavos);
          return (
            <li key={g.id} className={styles.card}>
              <div className={styles.kitHead}>
                <div>
                  <h3>{g.nombre}</h3>
                  <p className={styles.meta}>
                    {suyos.length} {suyos.length === 1 ? "vino" : "vinos"}
                    {aliados.length > 1 ? ` · ${aliados.find((a) => a.id === g.aliadoId)?.nombre ?? ""}` : ""}
                    {g.soloCaja ? " · se vende como caja completa" : ""}
                  </p>
                </div>
                {precios.length > 0 && (
                  <p className={styles.range}>
                    Kit de 6 desde <strong>{pesos(Math.min(...precios) * 6)}</strong>
                  </p>
                )}
              </div>
              {g.descripcion && <p className={styles.kitDesc}>{g.descripcion}</p>}
              <p className={styles.kitItems}>{suyos.map((v) => v.nombre).join(" · ")}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
