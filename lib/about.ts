// Contenido de Rafa Aguirre (portada y /nosotros). Textos finales aprobados el 26 oct 2026.

/** Foto de Rafa (scripts/build-home-images.mjs). Cuadrada; cada lugar la encuadra arriba, en su cara. */
export const RAFA_PHOTO: { src: string; width: number; height: number } = { src: "/img/rafa.webp", width: 768, height: 1024 };

/** Historia de Rafa con el vino, con sus palabras. Un párrafo por elemento. */
export const RAFA_STORY: string[] = [
  "Rafael Aguirre Palencia lleva más de 20 años en el mundo del vino: como enófilo, comunicador y explorador de la cultura vinícola. Ha recorrido regiones productoras de México, Estados Unidos, Francia, España, Alemania y Portugal, y ha participado en incontables catas y maridajes.",
  "También ha diseñado cartas de vinos para restaurantes, y desde @ViviendoVino comparte contenido y recomendaciones con una audiencia nacional e internacional, siempre de forma cercana y sin complicaciones. Colaborar con bodegas, restaurantes y tiendas de vino le ha enseñado a distinguir lo que vale la pena descubrir.",
];

/** Una frase de Rafa para destacar. */
export const RAFA_QUOTE = "El vino se disfruta más cuando se comparte.";

/** Datos de Rafa en cifras (franja mono bajo la historia). */
export const RAFA_FACTS: { value: string; label: string }[] = [
  { value: "+20 años", label: "en el mundo del vino" },
  { value: "6 países", label: "recorridos como enoturista" },
  { value: "+25 años", label: "en marketing y gastronomía" },
];

/** Línea secundaria al final de la biografía. */
export const RAFA_NOTE = "Fundador de Continental Media, agencia de marketing, comunicación y relaciones públicas especializada en gastronomía y hospitalidad.";

/** Criterios reales con los que Rafa elige cada vino (3 o 4). */
export const RAFA_CRITERIA: { title: string; text: string }[] = [
  { title: "Calidad", text: "Solo entran vinos que sostienen lo que prometen en la copa." },
  { title: "Autenticidad", text: "Productores con identidad, no etiquetas hechas en serie." },
  { title: "Origen", text: "Bodegas que merecen ser conocidas, de clásicos a hallazgos." },
  { title: "Personalidad", text: "Vinos con carácter, que sorprenden y dan de qué hablar." },
];

/** Despliegue de vista previa (dev.viviendovino.com): aquí se ven los placeholders y avisos de ejemplo. */
export const IS_PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "true";
