import type { ReactNode } from "react";
import { AnnouncementBar } from "@/app/_ui/AnnouncementBar";
import { Footer } from "@/app/_ui/Footer";
import { Header } from "@/app/_ui/Header";

// Marco de la tienda: anuncio, encabezado y pie. Siempre en claro (la tienda no sigue el modo oscuro).
export default function SitioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#contenido" className="vv-skip">
        Saltar al contenido
      </a>
      <AnnouncementBar text="Kits de 6 botellas con envío incluido en el precio." href="/#como-funciona" linkLabel="Cómo funciona" />
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}
