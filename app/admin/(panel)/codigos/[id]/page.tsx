import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/app/_ui/Notice";
import { getCodigos, getKitsEjemplo } from "@/lib/admin/codigos";
import { centavosATexto } from "@/lib/admin/catalogo-rules";
import { requireAdmin } from "@/lib/admin/session";
import { isoACdmx } from "@/lib/descuentos/rules";
import { SITE_URL } from "@/lib/site";
import { CodigoForm } from "../CodigoForm";

export const metadata: Metadata = { title: "Código · Códigos de descuento" };

export default async function Page({ params, searchParams }: PageProps<"/admin/codigos/[id]">) {
  await requireAdmin(["admin"]);
  const { id } = await params;
  const { aviso } = await searchParams;
  const [codigos, kits] = await Promise.all([getCodigos(), getKitsEjemplo()]);
  const x = codigos.find((y) => y.id === id);
  if (!x) notFound();
  return (
    <>
      {aviso === "creado" && <Notice kind="ok">Código creado. Copia el enlace de campaña para compartirlo.</Notice>}
      <CodigoForm
        key={x.id}
        siteUrl={SITE_URL}
        kits={kits}
        codigo={{
          id: x.id,
          codigo: x.codigo,
          descripcion: x.descripcion,
          texto_publico: x.textoPublico,
          tipo: x.tipo,
          valor: x.tipo === "porcentaje" ? String(x.valor / 100) : centavosATexto(x.valor),
          tope: x.topeCentavos ? centavosATexto(x.topeCentavos) : "",
          inicia: isoACdmx(x.iniciaAt),
          termina: x.terminaAt ? isoACdmx(x.terminaAt) : "",
          usos_max: x.usosMax ? String(x.usosMax) : "",
          usos_por_cliente: x.usosPorCliente ? String(x.usosPorCliente) : "",
          min_kits: x.minKits ? String(x.minKits) : "",
          solo_primera_compra: x.soloPrimeraCompra,
          activo: x.activo,
          usado: x.pedidos > 0,
        }}
      />
    </>
  );
}
