import type { Metadata } from "next";
import { fechaCdmx } from "@/lib/admin/comunidad-format";
import { getCorreos } from "@/lib/admin/correos";
import { requireAdmin } from "@/lib/admin/session";
import { DataTable } from "../_ui/DataTable";
import { PageHead } from "../_ui/PageHead";
import styles from "../_ui/panel.module.css";

export const metadata: Metadata = { title: "Correos" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const { filas, faltaTabla, desde30 } = await getCorreos();
  const recientes = filas.filter((f) => Date.parse(f.at) >= Date.parse(desde30));
  const n = (v: number) => v.toLocaleString("es-MX");
  const grupo = (f: (typeof filas)[number]) => (!f.ok ? "fallo" : f.para === "equipo" ? "equipo" : f.tipo.startsWith("pedido_") ? "pedidos" : "contenido");

  return (
    <>
      <PageHead
        title="Correos"
        text="Los correos que mandó la tienda: confirmaciones, envíos y entregas de pedidos, avisos al equipo, perfiles del quiz y guías del blog. “Enviado” significa que el servicio de correo lo aceptó."
      />
      <dl className={styles.stats}>
        <div>
          <dt>Enviados · 30 días</dt>
          <dd>{n(recientes.filter((f) => f.ok).length)}</dd>
        </div>
        <div>
          <dt>No se pudieron enviar · 30 días</dt>
          <dd>{n(recientes.filter((f) => !f.ok).length)}</dd>
        </div>
        <div>
          <dt>De pedidos al cliente</dt>
          <dd>{n(recientes.filter((f) => f.para === "cliente" && f.tipo.startsWith("pedido_")).length)}</dd>
        </div>
        <div>
          <dt>Del quiz y el blog</dt>
          <dd>{n(recientes.filter((f) => !f.tipo.startsWith("pedido_")).length)}</dd>
        </div>
      </dl>
      <DataTable
        columns={[
          { key: "fecha", label: "Fecha", kind: "fecha" },
          { key: "tipo", label: "Correo", primary: true },
          { key: "destinatario", label: "Para", kind: "email" },
          { key: "relacion", label: "Pedido o contenido", kind: "link" },
          { key: "estadoLabel", label: "Estado", kind: "estado" },
        ]}
        rows={filas.map((f) => ({
          id: f.id,
          fecha: fechaCdmx(f.at),
          tipo: `${f.tipoLabel}${f.reenvio ? " · reenvío" : ""}`,
          destinatario: f.destinatario,
          relacion: f.folio || (f.tipo === "guia" ? `Guía: ${f.referencia}` : f.tipo === "quiz_perfil" ? "Quiz" : ""),
          relacionHref: f.pedidoId ? `/admin/pedidos/${f.pedidoId}` : "",
          estadoLabel: f.ok ? "Enviado" : `No salió${f.error ? ` (${f.error})` : ""}`,
          tono: f.ok ? "ok" : "error",
          grupo: grupo(f),
        }))}
        searchKeys={["destinatario", "relacion", "tipo"]}
        searchLabel="Buscar por correo, pedido o tipo"
        filter={{
          key: "grupo",
          label: "Tipo de correo",
          all: "Todos",
          options: [
            { value: "pedidos", label: "Pedidos" },
            { value: "equipo", label: "Avisos al equipo" },
            { value: "contenido", label: "Quiz y blog" },
            { value: "fallo", label: "No salieron" },
          ],
        }}
        noun={["correo", "correos"]}
        empty={faltaTabla ? "Falta correr el SQL del registro de correos (20261102000000_correos.sql)." : "Todavía no sale ningún correo registrado."}
      />
    </>
  );
}
