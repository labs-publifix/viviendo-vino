// Códigos de descuento: reglas puras (sin Next) para el servidor, el navegador y las pruebas.
// Modelo broker: el descuento siempre sale del margen de Viviendo Vino. El aliado recibe íntegro su precio acordado,
// así que ningún descuento puede llevar el pedido debajo de "acordado + comisión de Mercado Pago" (el piso): si un
// código es más agresivo, se recorta a lo máximo posible. Un solo código por pedido.

import { comisionMPEstimada } from "../admin/pedidos-rules.ts";

export const TIPOS_CODIGO = ["porcentaje", "monto"] as const;
export type TipoCodigo = (typeof TIPOS_CODIGO)[number];

/** Código: letras y números, sin espacios, de 3 a 20; sin distinguir mayúsculas. */
export const CODIGO_RE = /^[A-Z0-9]{3,20}$/;
export const normalizarCodigo = (texto: string) => texto.normalize("NFKC").replace(/[\s-]/g, "").toUpperCase();
export const codigoValido = (texto: string) => CODIGO_RE.test(normalizarCodigo(texto));

// Sin 0/O ni 1/I/L: se dicta y se copia sin confundirse.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Código al azar de 8 caracteres (con prefijo opcional, p. ej. "VV"). `azar` devuelve números en [0, 1). */
export function generarCodigo(prefijo = "", azar: () => number = Math.random): string {
  const p = normalizarCodigo(prefijo).replace(/[^A-Z0-9]/g, "").slice(0, 8);
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABETO[Math.floor(azar() * ALFABETO.length)];
  return (p + s).slice(0, 20);
}

export type Codigo = {
  tipo: TipoCodigo;
  /** porcentaje: puntos base (1250 = 12.5 %); monto: centavos. */
  valor: number;
  /** Solo porcentaje: descuento máximo en centavos. */
  topeCentavos: number | null;
  minKits: number | null;
};

/** Descuento que el código daría sin el piso, redondeado al peso. */
export function descuentoNominal(c: Pick<Codigo, "tipo" | "valor" | "topeCentavos">, subtotalCentavos: number): number {
  if (subtotalCentavos <= 0) return 0;
  let d = c.tipo === "porcentaje" ? Math.round((subtotalCentavos * c.valor) / 10000 / 100) * 100 : c.valor;
  if (c.tipo === "porcentaje" && c.topeCentavos) d = Math.min(d, c.topeCentavos);
  return Math.max(0, Math.min(d, subtotalCentavos));
}

/** Total más bajo con el que Viviendo Vino no pierde: total − comisión de MP ≥ lo del aliado. */
export function totalMinimo(aliadoCentavos: number): number {
  if (aliadoCentavos <= 0) return 0;
  // Aproximación cerrada y ajuste fino (la comisión se redondea al centavo).
  let t = Math.max(aliadoCentavos, Math.floor(aliadoCentavos / 0.95));
  while (t - comisionMPEstimada(t) < aliadoCentavos) t++;
  while (t > aliadoCentavos && t - 1 - comisionMPEstimada(t - 1) >= aliadoCentavos) t--;
  return t;
}

/**
 * Descuento real de un pedido: el nominal, recortado al piso. Se redondea hacia abajo al peso para que el total
 * quede en pesos cerrados cuando se puede. `recortado`: el código pedía más de lo que el margen permite.
 */
export function aplicarDescuento(c: Pick<Codigo, "tipo" | "valor" | "topeCentavos">, subtotalCentavos: number, aliadoCentavos: number): { descuento: number; recortado: boolean; nominal: number } {
  const nominal = descuentoNominal(c, subtotalCentavos);
  const maximo = Math.max(0, subtotalCentavos - totalMinimo(aliadoCentavos));
  if (nominal <= maximo) return { descuento: nominal, recortado: false, nominal };
  const redondeado = Math.floor(maximo / 100) * 100;
  return { descuento: redondeado, recortado: true, nominal };
}

// ---------- Estado y motivos ----------

export type EstadoCodigo = "activo" | "programado" | "vencido" | "agotado" | "pausado";
export const ESTADO_CODIGO_LABEL: Record<EstadoCodigo, string> = {
  activo: "Activo",
  programado: "Programado",
  vencido: "Vencido",
  agotado: "Agotado",
  pausado: "Pausado",
};

export function estadoCodigo(c: { activo: boolean; iniciaAt: string; terminaAt: string | null; usosMax: number | null }, usos: number, ahora: number): EstadoCodigo {
  if (!c.activo) return "pausado";
  if (c.terminaAt && Date.parse(c.terminaAt) <= ahora) return "vencido";
  if (c.usosMax !== null && usos >= c.usosMax) return "agotado";
  if (Date.parse(c.iniciaAt) > ahora) return "programado";
  return "activo";
}

/** Motivos de la base (_codigo_motivo) y del servidor. */
export type MotivoCodigo = "no_existe" | "pausado" | "programado" | "vencido" | "agotado" | "usado" | "primera_compra" | "min_kits" | "sin_margen";

/** Lo que se le dice al cliente. Lo que no le ayuda a corregir nada se responde igual ("no es válido o ya venció"). */
export function textoMotivo(m: MotivoCodigo | string, c?: { minKits: number | null }): string {
  switch (m) {
    case "min_kits":
      return `Este código aplica en compras desde ${c?.minKits ?? 2} kits.`;
    case "usado":
      return "Ya usaste este código en otra compra.";
    case "primera_compra":
      return "Este código es solo para tu primera compra.";
    case "agotado":
      return "Este código ya alcanzó su límite de usos.";
    case "sin_margen":
      return "Este código no aplica a los vinos de tu carrito.";
    default:
      return "Este código no es válido o ya venció.";
  }
}

// ---------- Formulario del panel ----------

export type CodigoInput = {
  codigo: string;
  descripcion: string;
  texto_publico: string;
  tipo: string;
  valor: string;
  tope: string;
  inicia: string;
  termina: string;
  usos_max: string;
  usos_por_cliente: string;
  min_kits: string;
  solo_primera_compra: boolean;
};

export type CodigoDatos = {
  codigo: string;
  descripcion: string | null;
  texto_publico: string;
  tipo: TipoCodigo;
  valor: number;
  tope_centavos: number | null;
  inicia_at: string;
  termina_at: string | null;
  usos_max: number | null;
  usos_por_cliente: number | null;
  min_kits: number | null;
  solo_primera_compra: boolean;
};

const entero = (t: string, min: number, max: number): number | null | undefined => {
  const s = t.trim();
  if (!s) return null;
  if (!/^\d{1,6}$/.test(s)) return undefined;
  const n = Number(s);
  return n >= min && n <= max ? n : undefined;
};
const pesos = (t: string): number | null | undefined => {
  const s = t.replace(/[$\s,]/g, "");
  if (!s) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return undefined;
  const c = Math.round(Number(s) * 100);
  return c > 0 ? c : undefined;
};

/**
 * Fecha y hora de CDMX del formulario ("2026-11-19T09:00") → ISO. México no tiene horario de verano desde 2022:
 * CDMX es UTC−6 todo el año.
 */
export function cdmxAIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00-06:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
/** ISO → "2026-11-19T09:00" en hora de CDMX (para llenar el formulario). */
export function isoACdmx(iso: string): string {
  const d = new Date(Date.parse(iso) - 6 * 3600_000);
  return d.toISOString().slice(0, 16);
}

export function validarCodigo(input: CodigoInput, ahora: number): { ok: true; data: CodigoDatos } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const codigo = normalizarCodigo(input.codigo);
  if (!CODIGO_RE.test(codigo)) errors.codigo = "Usa de 3 a 20 letras o números, sin espacios ni acentos.";
  const texto = input.texto_publico.replace(/\s+/g, " ").trim();
  if (texto.length < 5 || texto.length > 160) errors.texto_publico = "Escribe las condiciones que verá el cliente (de 5 a 160 caracteres).";
  const descripcion = input.descripcion.replace(/\s+/g, " ").trim();
  if (descripcion.length > 200) errors.descripcion = "Usa máximo 200 caracteres.";
  const tipo = (TIPOS_CODIGO as readonly string[]).includes(input.tipo) ? (input.tipo as TipoCodigo) : null;
  if (!tipo) errors.tipo = "Elige el tipo de descuento.";

  let valor: number | null = null;
  if (tipo === "porcentaje") {
    const s = input.valor.replace(/[%\s]/g, "").replace(",", ".");
    const n = /^\d{1,2}(\.\d{1,2})?$/.test(s) ? Math.round(Number(s) * 100) : NaN;
    if (!(n >= 100 && n <= 9000)) errors.valor = "Escribe un porcentaje entre 1 y 90.";
    else valor = n;
  } else if (tipo === "monto") {
    const c = pesos(input.valor);
    if (!c) errors.valor = "Escribe el monto en pesos (por ejemplo, 200).";
    else valor = c;
  }
  const tope = tipo === "porcentaje" ? pesos(input.tope) : null;
  if (tope === undefined) errors.tope = "Escribe el tope en pesos o déjalo vacío.";

  const inicia = input.inicia.trim() ? cdmxAIso(input.inicia.trim()) : new Date(ahora).toISOString();
  if (!inicia) errors.inicia = "Revisa la fecha de inicio.";
  const termina = input.termina.trim() ? cdmxAIso(input.termina.trim()) : null;
  if (input.termina.trim() && !termina) errors.termina = "Revisa la fecha de fin.";
  if (inicia && termina && Date.parse(termina) <= Date.parse(inicia)) errors.termina = "El fin tiene que ser después del inicio.";

  const usosMax = entero(input.usos_max, 1, 100000);
  if (usosMax === undefined) errors.usos_max = "Escribe un número entero o déjalo vacío (sin límite).";
  const porCliente = entero(input.usos_por_cliente, 1, 100);
  if (porCliente === undefined) errors.usos_por_cliente = "Escribe un número entero o déjalo vacío (sin límite).";
  const minKits = entero(input.min_kits, 1, 10);
  if (minKits === undefined) errors.min_kits = "Escribe de 1 a 10 kits o déjalo vacío.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      codigo,
      descripcion: descripcion || null,
      texto_publico: texto,
      tipo: tipo!,
      valor: valor!,
      tope_centavos: tope ?? null,
      inicia_at: inicia!,
      termina_at: termina,
      usos_max: usosMax ?? null,
      usos_por_cliente: porCliente ?? null,
      min_kits: minKits && minKits > 1 ? minKits : null,
      solo_primera_compra: input.solo_primera_compra,
    },
  };
}

/** "10 %", "12.5 % (hasta $300)", "$200". */
export function textoValor(c: Pick<Codigo, "tipo" | "valor" | "topeCentavos">): string {
  const pesosTxt = (x: number) => `$${(x / 100).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
  if (c.tipo === "monto") return pesosTxt(c.valor);
  const pct = `${(c.valor / 100).toLocaleString("es-MX", { maximumFractionDigits: 2 })} %`;
  return c.topeCentavos ? `${pct} (hasta ${pesosTxt(c.topeCentavos)})` : pct;
}
