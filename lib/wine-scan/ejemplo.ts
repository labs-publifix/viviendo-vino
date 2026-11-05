// Ejemplo de resultado para la página de Wine Scan (capturado de un escaneo real: Levorato · Soave DOC).
// Cámbialo aquí sin tocar el marcado. El producto parecido se lee del catálogo por su slug (nombre, foto y precio
// reales); puede apuntarse a cualquier otro vino de la tienda cambiando `parecidoSlug`.

export const EJEMPLO_WINE_SCAN = {
  vino: "Soave DOC",
  productor: "Levorato",
  meta: ["Levorato", "Véneto", "Italia"],
  uva: "Garganega",
  confianza: "Confianza alta",
  aromas: "Aromas suaves de almendra, flores blancas y fruta de hueso.",
  perfil: [
    { etiqueta: "Cuerpo", nivel: 2, texto: "Ligero a medio" },
    { etiqueta: "Acidez", nivel: 3, texto: "Media" },
    { etiqueta: "Dulzor", nivel: 1, texto: "Seco", nota: "Menos de 4 g/L de azúcar residual" },
  ],
  temperatura: "7 a 9",
  copa: "Copa de vino blanco estándar",
  decantar: "No hace falta decantarlo",
  maridajes: ["Platos ligeros y delicados", "Platos con toque cítrico o ensaladas con aderezo ligero", "Aperitivo o reunión sin plato fuerte"],
  dato: "El Soave se hace en el Véneto y su uva principal es la Garganega.",
  /** Vino de la tienda que se muestra como "vino parecido". */
  parecidoSlug: "soave-doc-2024",
  /** Chip flotante sobre la foto del hero. */
  chip: "Soave · Garganega · 7 a 9 °C",
} as const;
