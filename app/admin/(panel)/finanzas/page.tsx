import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Soon } from "../_ui/Soon";

export const metadata: Metadata = { title: "Finanzas" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHead title="Finanzas" text="Ventas, comisiones y transferencias al aliado." />
      <Soon
        when="viernes 30"
        items={[
          "Ver cada venta con su comisión y lo que le toca al aliado",
          "Registrar las transferencias al aliado",
          "Exportar a CSV para contabilidad",
        ]}
      />
    </>
  );
}
