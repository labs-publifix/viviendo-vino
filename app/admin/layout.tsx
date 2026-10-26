import type { Metadata } from "next";
import type { ReactNode } from "react";

// Panel de administración (docs/ADMIN.md). Fuera de la tienda: sin encabezado, pie ni aviso de edad.
// Nunca se indexa.
export const metadata: Metadata = {
  title: { default: "Admin · Viviendo Vino", template: "%s · Admin · Viviendo Vino" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
