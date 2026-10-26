import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Soon } from "../_ui/Soon";

export const metadata: Metadata = { title: "Marquesina y anuncios" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHead title="Marquesina y anuncios" text="Los mensajes de la barra de arriba de la tienda." />
      <Soon
        when="miércoles 28"
        items={[
          "Editar los 4 mensajes que se ven hoy",
          "Agregar mensajes nuevos y cambiar su orden",
          "Programar cuándo empieza y termina cada uno (hora de la Ciudad de México)",
        ]}
      />
    </>
  );
}
