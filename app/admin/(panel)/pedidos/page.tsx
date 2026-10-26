import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Soon } from "../_ui/Soon";

export const metadata: Metadata = { title: "Pedidos" };

export default async function Page() {
  await requireAdmin(["admin", "aliado", "atencion"]);
  return (
    <>
      <PageHead title="Pedidos" text="Todos los pedidos de la tienda y en qué paso va cada uno." />
      <Soon
        when="viernes 30"
        items={[
          "Buscar por número de pedido, nombre o correo",
          "Ver los kits, la dirección, si es regalo y si pidió factura",
          "Cambiar el estado y agregar la guía de envío",
          "Dejar notas internas y ver el historial de cada pedido",
        ]}
        note="Se prueba con pedidos de prueba en dev; los reales llegan cuando conectemos Mercado Pago."
      />
    </>
  );
}
