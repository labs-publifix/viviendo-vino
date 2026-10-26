import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "./_ui/PageHead";
import { Soon } from "./_ui/Soon";

export const metadata: Metadata = { title: "Inicio" };

export default async function Page() {
  await requireAdmin(["admin", "aliado", "atencion"]);
  return (
    <>
      <PageHead title="Inicio" text="Cómo va la tienda hoy y qué necesita tu atención." />
      <Soon
        when="jueves 29"
        items={[
          "Ventas de hoy y de la semana",
          "Pedidos por preparar y los que van atrasados",
          "Vinos agotados",
          "Lo pendiente por transferir al aliado",
        ]}
      />
    </>
  );
}
