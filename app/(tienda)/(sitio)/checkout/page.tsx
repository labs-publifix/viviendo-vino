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
  return <Checkout pagoPrueba={process.env.VERCEL_ENV !== "production"} />;
}
