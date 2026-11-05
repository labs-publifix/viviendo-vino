// Datos de contacto de Viviendo Vino: la única fuente para el pie, /contacto, los legales, el carrito, el checkout y
// los correos. Cambia aquí y se actualiza en todo el sitio. WhatsApp usa el mismo número que el teléfono.

/** Número de México a 10 dígitos. Teléfono y WhatsApp usan el mismo; si algún día se separan, cambia WHATSAPP_DIGITOS. */
const NUMERO = "2291325000";
const WHATSAPP_DIGITOS = NUMERO;
const WHATSAPP_MENSAJE = "Hola, vengo del sitio de Viviendo Vino y quisiera más información.";

/** "229 132 5000" */
const formatear = (n: string) => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;

const CORREO = "hola@viviendovino.com";
const DOMICILIO = "Bv. Adolfo Ruiz Cortines 3642, Costa de Oro, 94299 Boca del Río, Ver.";

export const CONTACTO = {
  telefono: { texto: formatear(NUMERO), href: `tel:+52${NUMERO}` },
  // wa.me con 52 + 10 dígitos (México ya no usa el "1" de celular) y el mensaje codificado.
  whatsapp: { texto: formatear(WHATSAPP_DIGITOS), href: `https://wa.me/52${WHATSAPP_DIGITOS}?text=${encodeURIComponent(WHATSAPP_MENSAJE)}` },
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
