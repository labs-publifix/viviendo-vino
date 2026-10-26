import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Soon } from "../_ui/Soon";

export const metadata: Metadata = { title: "Configuración" };

export default async function Page() {
  await requireAdmin(["admin", "aliado", "atencion"]);
  return (
    <>
      <PageHead title="Configuración" text="Tu equipo, los datos del aliado y tu cuenta." />
      <Soon
        when="miércoles 28"
        items={[
          "Invitar personas al panel, cambiar su rol o quitarles el acceso",
          "Editar los datos del aliado",
          "Cambiar tu contraseña y activar el código en dos pasos",
        ]}
      />
    </>
  );
}
