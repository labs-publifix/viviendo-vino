import Script from "next/script";
import { ClicsContacto } from "./ClicsContacto";

// Google Analytics 4 (aprobado el 17 nov 2026). Solo en producción y con NEXT_PUBLIC_GA_ID; en dev y local no carga.
// Sin señales de Google ni personalización de anuncios (Aviso de Privacidad, sección 8). Las vistas de página de la
// navegación interna las cuenta GA4 con la medición mejorada ("cambios de historial del navegador").
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ACTIVO = Boolean(GA_ID) && process.env.VERCEL_ENV === "production" && /^G-[A-Z0-9]+$/.test(GA_ID ?? "");

export function Analytics() {
  if (!ACTIVO) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
      </Script>
      <ClicsContacto />
    </>
  );
}
