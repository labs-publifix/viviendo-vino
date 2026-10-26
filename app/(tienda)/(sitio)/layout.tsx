import type { ReactNode } from "react";
import { AgeGate, AGE_GATE_SCRIPT } from "@/app/_ui/AgeGate";
import { AnnouncementBar } from "@/app/_ui/AnnouncementBar";
import { Footer } from "@/app/_ui/Footer";
import { Header } from "@/app/_ui/Header";
import { getAnunciosTienda } from "@/lib/anuncios-repo";

// Marquesina editable desde /admin/anuncios (con respaldo si la base no responde).
async function Anuncios() {
  return <AnnouncementBar items={await getAnunciosTienda()} />;
}

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
      <Anuncios />
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}
