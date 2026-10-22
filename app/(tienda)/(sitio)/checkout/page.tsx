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
  return <Checkout />;
}
