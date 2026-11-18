import { isValidElement, type ReactNode } from "react";
import { AUTHOR } from "@/lib/blog/meta";
import { CONTACTO } from "@/lib/contacto";
import { SITE_URL } from "@/lib/site";
import { SOCIAL } from "@/lib/social";

// Datos estructurados (schema.org, JSON-LD) del sitio. Todo sale de datos que ya están publicados en el sitio:
// contacto (lib/contacto.ts), redes (lib/social.ts), Términos (devoluciones: §12) y Envíos (hasta 7 días hábiles).
// Se pintan con <JsonLd> (app/_ui/JsonLd.tsx).

export type Json = Record<string, unknown>;

export const ID_NEGOCIO = `${SITE_URL}/#negocio`;
export const ID_SITIO = `${SITE_URL}/#sitio`;
const LOGO = `${SITE_URL}/email/logo-viviendo-vino.png`;

/** La tienda: nombre, logo, contacto, domicilio, horario de atención y redes. Va en la portada. */
export function negocio(): Json {
  return {
    "@type": "OnlineStore",
    "@id": ID_NEGOCIO,
    name: "Viviendo Vino",
    url: `${SITE_URL}/`,
    logo: { "@type": "ImageObject", url: LOGO },
    image: `${SITE_URL}/img/og/inicio.jpg`,
    description: "Tienda en línea de vino italiano en kits de 6 botellas, con el envío a todo México incluido en el precio.",
    email: CONTACTO.correo.texto,
    telephone: `+52 ${CONTACTO.telefono.texto}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Bv. Adolfo Ruiz Cortines 3642, Costa de Oro",
      postalCode: "94299",
      addressLocality: "Boca del Río",
      addressRegion: "Veracruz",
      addressCountry: "MX",
    },
    areaServed: { "@type": "Country", name: "México" },
    currenciesAccepted: "MXN",
    founder: { "@type": "Person", name: AUTHOR.name, url: `${SITE_URL}/nosotros` },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: `+52 ${CONTACTO.telefono.texto}`,
      email: CONTACTO.correo.texto,
      areaServed: "MX",
      availableLanguage: "es",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    },
    sameAs: SOCIAL.map((s) => s.href),
  };
}

export function sitioWeb(): Json {
  return { "@type": "WebSite", "@id": ID_SITIO, url: `${SITE_URL}/`, name: "Viviendo Vino", inLanguage: "es-MX", publisher: { "@id": ID_NEGOCIO } };
}

/** Migas de pan: [["Inicio", "/"], ["Vinos", "/vinos"], ["Langhe Nebbiolo", "/vinos/langhe-nebbiolo"]]. */
export function migas(pasos: [nombre: string, ruta: string][]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: pasos.map(([name, ruta], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE_URL}${ruta}` })),
  };
}

/** Envío incluido a todo México; entrega en hasta 7 días hábiles (Términos §10). */
export const ENVIO_INCLUIDO: Json = {
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "MXN" },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "MX" },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 5, unitCode: "DAY" },
  },
};

/** Revocación de 5 días hábiles desde la entrega; el envío de regreso lo paga el cliente (Términos §12). */
export const POLITICA_DEVOLUCION: Json = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "MX",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 5,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnShippingFees",
  merchantReturnLink: `${SITE_URL}/terminos`,
};

/** Herramienta gratuita del sitio (Wine Scan, Quiz IA). */
export function aplicacion(p: { nombre: string; ruta: string; descripcion: string }): Json {
  return {
    "@type": "WebApplication",
    name: p.nombre,
    url: `${SITE_URL}${p.ruta}`,
    description: p.descripcion,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: "es-MX",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "MXN" },
    publisher: { "@id": ID_NEGOCIO },
  };
}

/** Texto plano de una respuesta escrita en JSX (enlaces y negritas incluidos). */
export function textoPlano(nodo: ReactNode): string {
  if (nodo == null || typeof nodo === "boolean") return "";
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoPlano).join("");
  if (isValidElement<{ children?: ReactNode }>(nodo)) return textoPlano(nodo.props.children);
  return "";
}

export function preguntasFrecuentes(items: { q: string; a: ReactNode }[]): Json {
  return {
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: textoPlano(a).replace(/\s+/g, " ").trim() },
    })),
  };
}

/** Un solo bloque JSON-LD con varios nodos. */
export const grafo = (...nodos: Json[]): Json => ({ "@context": "https://schema.org", "@graph": nodos });
