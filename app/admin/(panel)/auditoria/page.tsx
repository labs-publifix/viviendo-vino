import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { PageHead } from "../_ui/PageHead";
import { Soon } from "../_ui/Soon";

export const metadata: Metadata = { title: "Auditoría" };

export default async function Page() {
  await requireAdmin(["admin"]);
  return (
    <>
      <PageHead title="Auditoría" text="Quién cambió qué y cuándo. Solo lectura." />
      <Soon
        when="miércoles 28"
        items={[
          "Ver cada cambio con la persona, la fecha y la hora",
          "Comparar el valor anterior con el nuevo",
          "Filtrar por persona o por sección",
        ]}
        note="El registro ya se guarda desde hoy; lo que llega el miércoles es la pantalla para consultarlo."
      />
    </>
  );
}
