import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/app/_ui/Button";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { codigosActivos, promoPorCodigo } from "@/lib/promo";
import type { Promo } from "@/lib/promo-rules";
import { seo } from "@/lib/seo";
import { AplicarCodigo } from "./AplicarCodigo";
import styles from "./promo.module.css";

// /promo/<CÓDIGO>: el enlace para compartir un código de descuento. Aplica el código (queda guardado para el
// checkout), lo explica con el texto público del panel y lleva a armar el kit. Tiene su imagen para compartir y
// no se indexa: las promociones son temporales. El enlace de siempre (/?codigo=…) sigue funcionando igual.

const RELLENO = "PROMO";

export async function generateStaticParams() {
  const codigos = storeEnabled() ? await codigosActivos() : [];
  return (codigos.length > 0 ? codigos : [RELLENO]).map((codigo) => ({ codigo }));
}

async function cargar(params: Promise<{ codigo: string }>) {
  const { codigo } = await params;
  return storeEnabled() ? promoPorCodigo(codigo) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }): Promise<Metadata> {
  const p = await cargar(params);
  const usable = p && (p.estado === "vigente" || p.estado === "programado");
  const base = usable
    ? seo({
        titulo: `${p.titular} · Código ${p.codigo} · Viviendo Vino`,
        descripcion: `${p.textoPublico.trim().replace(/([^.!?])$/, "$1.")} Arma tu kit de 6 botellas de vino italiano con envío incluido.`,
        ruta: `/promo/${p.codigo}`,
        tituloSocial: `${p.titular} · Código ${p.codigo}`,
      })
    : seo({ titulo: "Arma tu kit de 6 botellas · Viviendo Vino", descripcion: "Elige 6 botellas de vino italiano y arma tu kit. El envío va incluido en el precio.", ruta: "/" });
  return { ...base, robots: { index: false, follow: true } };
}

function Vigente({ p }: { p: Promo }) {
  return (
    <>
      <AplicarCodigo codigo={p.codigo} />
      <NumberedLabel>Código de descuento</NumberedLabel>
      <Heading level={1} size="section">
        {p.titular}.
      </Heading>
      <p className={styles.lede}>{p.textoPublico}</p>
      <div className={styles.codigo}>
        <span className={styles.codigoTexto}>{p.codigo}</span>
        <span className={styles.aplicado}>
          {p.estado === "programado" ? `Ya quedó guardado. Se puede usar desde el ${p.inicia}.` : "Ya quedó aplicado: se descuenta al pagar."}
        </span>
      </div>
      <ul className={styles.condiciones}>
        {p.condiciones.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className={styles.acciones}>
        <ButtonLink href="/arma-tu-kit" size="lg">
          Arma tu kit
        </ButtonLink>
        <ButtonLink href="/vinos" variant="secondary" size="lg">
          Ver los vinos
        </ButtonLink>
      </div>
    </>
  );
}

function NoDisponible({ codigo }: { codigo: string | null }) {
  return (
    <>
      <NumberedLabel>Código de descuento</NumberedLabel>
      <Heading level={1} size="section">
        Este código ya no está disponible.
      </Heading>
      <p className={styles.lede}>
        {codigo ? `${codigo} venció o ya no se puede usar.` : "No encontramos ese código."} Aun así, puedes armar tu kit de 6 botellas con el envío incluido en el precio.
      </p>
      <div className={styles.acciones}>
        <ButtonLink href="/arma-tu-kit" size="lg">
          Arma tu kit
        </ButtonLink>
        <ButtonLink href="/vinos" variant="secondary" size="lg">
          Ver los vinos
        </ButtonLink>
      </div>
    </>
  );
}

async function Contenido({ params }: { params: Promise<{ codigo: string }> }) {
  const p = await cargar(params);
  const usable = p && (p.estado === "vigente" || p.estado === "programado");
  return (
    <section className={styles.page} aria-label="Código de descuento">
      <div className={styles.texto}>{usable ? <Vigente p={p} /> : <NoDisponible codigo={p?.codigo ?? null} />}</div>
      <div className={styles.media}>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto ya optimizada */}
        <img src="/img/kits/tintos-de-diario.webp" alt="Kit de seis botellas de vino tinto italiano de Viviendo Vino" width={880} height={660} />
      </div>
    </section>
  );
}

export default function Page({ params }: { params: Promise<{ codigo: string }> }) {
  if (!storeEnabled()) notFound();
  return (
    <Suspense>
      <Contenido params={params} />
    </Suspense>
  );
}
