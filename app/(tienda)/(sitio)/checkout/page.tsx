import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeEnabled } from "@/lib/catalog/enabled";
import { Checkout } from "./Checkout";

export const metadata: Metadata = {
  title: "Checkout · Viviendo Vino",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  if (!storeEnabled()) notFound();
  // Pago de prueba solo fuera de producción (dev y local), mientras se conecta Mercado Pago.
  // Pago con tarjeta: la Public Key de Mercado Pago (pública por diseño). Sin ella, en dev queda el pago de prueba.
  const mpPublicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || null;
  return <Checkout pagoPrueba={!mpPublicKey && process.env.VERCEL_ENV !== "production"} mpPublicKey={mpPublicKey} />;
}
