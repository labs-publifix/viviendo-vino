// Datos de contacto de Viviendo Vino: la única fuente para el pie, /contacto, los legales, el carrito, el checkout y
// los correos. Cambia aquí y se actualiza en todo el sitio. Por ahora el contacto es por teléfono y correo (sin WhatsApp).

/** Número de México a 10 dígitos. */
const NUMERO = "2291325000";

/** "229 132 5000" */
const formatear = (n: string) => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;

const CORREO = "hola@viviendovino.com";
const DOMICILIO = "Bv. Adolfo Ruiz Cortines 3642, Costa de Oro, 94299 Boca del Río, Ver.";

export const CONTACTO = {
  telefono: { texto: formatear(NUMERO), href: `tel:+52${NUMERO}` },
  correo: { texto: CORREO, href: `mailto:${CORREO}` },
  horario: "Lunes a viernes, 9:00 a 18:00 (hora CDMX)",
  domicilio: {
    texto: DOMICILIO,
    mapa: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DOMICILIO)}`,
  },
  // TODO(confirmar): razón social y RFC. El pie los muestra en una línea pequeña solo cuando tengan valor.
  razonSocial: "",
  rfc: "",
} as const;

/** Buzón que recibe los mensajes del formulario de /contacto. */
export const CONTACTO_BUZON = CORREO;
