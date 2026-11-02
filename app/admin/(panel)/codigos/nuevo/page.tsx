import type { Metadata } from "next";
import { getCodigos, getKitsEjemplo } from "@/lib/admin/codigos";
import { requireAdmin } from "@/lib/admin/session";
import { centavosATexto } from "@/lib/admin/catalogo-rules";
import { SITE_URL } from "@/lib/site";
import { CodigoForm } from "../CodigoForm";

export const metadata: Metadata = { title: "Nuevo código · Códigos de descuento" };

// Nuevo código. Con ?desde=<id> se duplica uno (mismas reglas, otro código y otro valor).
export default async function Page({ searchParams }: PageProps<"/admin/codigos/nuevo">) {
  await requireAdmin(["admin"]);
  const desde = (await searchParams).desde;
  const [kits, codigos] = await Promise.all([getKitsEjemplo(), typeof desde === "string" ? getCodigos() : Promise.resolve([])]);
  const base = codigos.find((x) => x.id === desde);
  return (
    <CodigoForm
      siteUrl={SITE_URL}
      kits={kits}
      codigo={{
        codigo: "",
        descripcion: base?.descripcion ?? "",
        texto_publico: base?.textoPublico ?? "",
        tipo: base?.tipo ?? "porcentaje",
        valor: base ? (base.tipo === "porcentaje" ? String(base.valor / 100) : centavosATexto(base.valor)) : "",
        tope: base?.topeCentavos ? centavosATexto(base.topeCentavos) : "",
        inicia: "",
        termina: "",
        usos_max: base?.usosMax ? String(base.usosMax) : "",
        usos_por_cliente: base ? (base.usosPorCliente ? String(base.usosPorCliente) : "") : "1",
        min_kits: base?.minKits ? String(base.minKits) : "",
        solo_primera_compra: base?.soloPrimeraCompra ?? false,
        activo: true,
        usado: false,
      }}
    />
  );
}
