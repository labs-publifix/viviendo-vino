import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { launch } from "@/lib/launch";
import { PreviewRibbon } from "@/app/_preview/PreviewRibbon";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500"],
});

const IS_PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "true";
const title = "Viviendo Vino · Lista de espera";
const description = `Tienda en línea de kits de 6 botellas de vino, armados por ti. Abrimos el ${launch.day}. Apúntate y recibe un regalo sorpresa con tu primer kit.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Viviendo Vino",
    locale: "es_MX",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
  // El preview privado nunca se indexa (además de X-Robots-Tag y robots.txt).
  ...(IS_PREVIEW ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3ece4" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0206" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <body>
        {children}
        {IS_PREVIEW && <PreviewRibbon />}
      </body>
    </html>
  );
}
