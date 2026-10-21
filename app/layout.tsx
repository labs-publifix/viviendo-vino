import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { launch } from "@/lib/launch";
import { PreviewRibbon } from "@/app/_preview/PreviewRibbon";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800", "900"],
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
  // Favicons y webclips del kit de marca (public/, sin modificar; ver docs/favicons-head-snippet.html).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#9A2031" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: { title: "Viviendo Vino" },
  other: { "msapplication-TileColor": "#9A2031", "msapplication-config": "/browserconfig.xml" },
  // El preview privado nunca se indexa (además de X-Robots-Tag y robots.txt).
  ...(IS_PREVIEW ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  // theme-color del kit de marca.
  themeColor: "#9A2031",
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
