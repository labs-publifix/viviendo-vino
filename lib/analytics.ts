// Eventos de Google Analytics 4. Si GA no está cargado (dev, local o sin NEXT_PUBLIC_GA_ID) no hace nada, así que se
// puede llamar desde cualquier componente del navegador sin preguntar. Nunca se manda nombre, correo, teléfono ni
// domicilio (Aviso de Privacidad, sección 8): solo folio, montos, nombres de vino y la ubicación del clic.

type Gtag = (cmd: "event", nombre: string, params?: Record<string, unknown>) => void;

export function evento(nombre: string, params: Record<string, unknown> = {}) {
  try {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    gtag?.("event", nombre, params);
  } catch {
    // Medir nunca debe romper la tienda.
  }
}

/** Montos de la tienda (centavos) a pesos para GA4. */
export const pesos = (centavos: number) => Math.round(centavos) / 100;
