import type { ReactNode } from "react";
import { AgeGate, AGE_GATE_SCRIPT } from "@/app/_ui/AgeGate";
import { AnnouncementBar } from "@/app/_ui/AnnouncementBar";
import { Footer } from "@/app/_ui/Footer";
import { Header } from "@/app/_ui/Header";

// Textos de muestra de la marquesina (en revisión con el equipo).
const ANUNCIOS = [
  "Kits de 6 botellas con envío incluido",
  "Arma tu kit desde $1,800",
  "Sin compra mínima",
  "Vino italiano de Véneto, Piamonte, Abruzzo y Puglia",
  "Repite las botellas que quieras",
];

// Marco de la tienda: anuncio, encabezado y pie. Siempre en claro (la tienda no sigue el modo oscuro).
export default function SitioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Antes del aviso: si ya confirmó su edad, el aviso no llega a pintarse. */}
      <script dangerouslySetInnerHTML={{ __html: AGE_GATE_SCRIPT }} />
      <AgeGate />
      <a href="#contenido" className="vv-skip">
        Saltar al contenido
      </a>
      <AnnouncementBar items={ANUNCIOS} href="/#como-funciona" linkLabel="Cómo funciona" />
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}
