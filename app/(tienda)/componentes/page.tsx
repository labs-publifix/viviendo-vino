import type { Metadata } from "next";
import { Showcase } from "./Showcase";

// Página de muestra del sistema de diseño para revisión del equipo. Ruta de la tienda: solo existe en el
// preview (y en producción cuando STORE_OPEN=true). Se puede retirar antes del lanzamiento.
export const metadata: Metadata = {
  title: "Componentes · Viviendo Vino",
  robots: { index: false, follow: false },
};

export default function ComponentesPage() {
  return <Showcase />;
}
