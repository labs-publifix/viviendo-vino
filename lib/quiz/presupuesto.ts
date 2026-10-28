// Rangos de presupuesto del quiz, proporcionales al kit más barato del catálogo (28 oct 2026). Así, cuando
// Viviendo Vino ajusta precios, los rangos se mueven solos y siguen recomendando bien. Con el kit más barato en
// $1,800 dan los rangos aprobados: hasta $2,100 · $2,100–$2,800 · $2,800–$4,000 · sin tope.
// Los ids ("hasta-2100", …) son claves internas históricas: no se muestran y no cambian.
// Puro, para usarlo igual en el navegador, el servidor y las pruebas.

type OpcionPresupuesto = { id: string; texto: string; min_centavos?: number; max_centavos?: number | null; factor_min?: number; factor_max?: number };
type PreguntaPresupuesto = { id: string; base_centavos?: number; opciones: OpcionPresupuesto[] };

const pesos = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const enPesos = (c: number) => `$${pesos.format(Math.round(c / 100))}`;
/** Redondea a cientos de pesos. */
const redondo = (c: number) => Math.round(c / 10000) * 10000;

/**
 * Copia la configuración con los montos y textos de presupuesto calculados para `kitMinCentavos` (el kit de 6
 * más barato). Sin ese dato usa la base de la configuración ($1,800).
 */
export function conPresupuesto<T extends { preguntas: unknown[] }>(config: T, kitMinCentavos: number | null): T {
  const preguntas = (config.preguntas as PreguntaPresupuesto[]).map((q) => {
    if (q.id !== "presupuesto") return q;
    const base = kitMinCentavos && kitMinCentavos > 0 ? kitMinCentavos : (q.base_centavos ?? 180000);
    return {
      ...q,
      opciones: q.opciones.map((o) => {
        const min = o.factor_min ? redondo(base * o.factor_min) : (o.min_centavos ?? 0);
        const max = o.factor_max ? redondo(base * o.factor_max) : (o.max_centavos ?? null);
        const texto = o.texto.replaceAll("{min}", enPesos(min)).replaceAll("{max}", max !== null ? enPesos(max) : "");
        return { ...o, min_centavos: min, max_centavos: max, texto };
      }),
    };
  });
  return { ...config, preguntas } as T;
}
