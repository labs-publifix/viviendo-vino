// Página de promoción /promo/<CÓDIGO> (enlace para compartir un código de descuento). Reglas puras: titular,
// condiciones y estado a partir de la fila de codigos_descuento. Sin Next ni base, para usarlas en las pruebas.

export type CodigoFila = {
  codigo: string;
  texto_publico: string;
  tipo: "porcentaje" | "monto";
  valor: number;
  tope_centavos: number | null;
  inicia_at: string;
  termina_at: string | null;
  usos_max: number | null;
  usos_por_cliente: number | null;
  min_kits: number | null;
  solo_primera_compra: boolean;
};

/** null = se puede usar; si no, el motivo de _codigo_motivo (pausado, programado, vencido, agotado…). */
export type EstadoPromo = "vigente" | "programado" | "vencido" | "agotado" | "pausado" | "no_existe";

export type Promo = {
  codigo: string;
  textoPublico: string;
  /** "10 % de descuento en tu kit" o "$200 de descuento en tu compra". */
  titular: string;
  /** "10 %" o "$200": lo que va grande en la imagen para compartir. */
  cifra: string;
  condiciones: string[];
  estado: EstadoPromo;
  /** Fecha de inicio legible si todavía no empieza. */
  inicia: string | null;
};

const RE = /^[A-Z0-9]{3,20}$/;

/** "viviendovino" → "VIVIENDOVINO"; null si no tiene forma de código. */
export function normalizarCodigoPromo(raw: string): string | null {
  let c = raw;
  try {
    c = decodeURIComponent(raw);
  } catch {
    return null;
  }
  c = c.replace(/[\s-]/g, "").toUpperCase();
  return RE.test(c) ? c : null;
}

const PESOS = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const pesos = (centavos: number) => `$${PESOS.format(Math.round(centavos / 100))}`;

/** "jueves 19 de noviembre a las 9:00" en hora del centro de México. */
export function fechaPromo(iso: string): string {
  const d = new Date(iso);
  const dia = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long" }).format(d);
  const hora = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "numeric", minute: "2-digit", hour12: false }).format(d);
  return `${dia.replace(",", "")} a las ${hora.replace(/^0(\d)/, "$1")}`;
}

/** Fecha de fin: 23:59 se lee mejor que "a las 23:59" para "hasta el…". */
function hasta(iso: string): string {
  return fechaPromo(iso).replace(/ a las 23:59$/, ", 11:59 pm");
}

export function armarPromo(c: CodigoFila, motivo: string | null): Promo {
  const cifra = c.tipo === "porcentaje" ? `${PESOS.format(c.valor / 100)} %` : pesos(c.valor);
  const titular = c.tipo === "porcentaje" ? `${cifra} de descuento en tu kit` : `${cifra} de descuento en tu compra`;
  const condiciones: string[] = [];
  if (c.tipo === "porcentaje" && c.tope_centavos) condiciones.push(`Hasta ${pesos(c.tope_centavos)} de descuento.`);
  if (c.termina_at) condiciones.push(`Válido hasta el ${hasta(c.termina_at)} (hora del centro de México).`);
  if (c.min_kits && c.min_kits > 1) condiciones.push(`En compras de ${c.min_kits} kits o más.`);
  if (c.usos_por_cliente === 1) condiciones.push("Un uso por persona.");
  if (c.solo_primera_compra) condiciones.push("Solo en tu primera compra.");
  if (c.usos_max) condiciones.push("Cupo limitado.");
  condiciones.push("Se aplica al pagar; el envío ya va incluido en el precio.");

  const estado: EstadoPromo =
    motivo === null || motivo === "min_kits" ? "vigente" : (["programado", "vencido", "agotado", "pausado", "no_existe"] as const).find((e) => e === motivo) ?? "vencido";
  return {
    codigo: c.codigo,
    textoPublico: c.texto_publico,
    titular,
    cifra,
    condiciones,
    estado,
    inicia: estado === "programado" ? fechaPromo(c.inicia_at) : null,
  };
}
