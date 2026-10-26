import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { MAX_ANUNCIOS } from "@/lib/anuncios";
import { PageHead } from "../_ui/PageHead";
import { AnunciosManager } from "./AnunciosManager";
import { getAnunciosPanel } from "./data";

export const metadata: Metadata = { title: "Marquesina y anuncios" };

export default async function Page() {
  await requireAdmin(["admin"]);
  const { items, preview } = await getAnunciosPanel();
  return (
    <>
      <PageHead
        title="Marquesina y anuncios"
        text="Los mensajes que corren en la barra de arriba de la tienda. Lo que guardes aquí se ve en la tienda al momento."
      />
      <AnunciosManager items={items} preview={preview} max={MAX_ANUNCIOS} />
    </>
  );
}
