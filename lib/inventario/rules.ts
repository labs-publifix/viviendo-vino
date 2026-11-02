// Reglas del inventario. Puras (sin Next) para usarlas igual en el servidor, el navegador y las pruebas.
// La base hace las cuentas definitivas con los vinos bloqueados (20261105000000_inventario.sql); aquí viven los
// umbrales, los textos y las validaciones de lo que llega del panel o de la tienda.

/** Con 3 botellas o menos un vino tiene "pocas" existencias (aviso por correo al admin y al aliado). */
export const UMBRAL_POCAS = 3;
/** Minutos que se apartan las botellas al iniciar el pago. */
export const APARTADO_MINUTOS = 30;
/** Veces seguidas que se puede renovar un apartado vencido. */
export const MAX_RENOVACIONES = 3;
/** Tope para fijar existencias desde el panel (evita errores de dedo de miles de botellas). */
export const EXISTENCIAS_MAX = 9999;

export type EstadoInventario = "agotado" | "pocas" | "ok";
export function estadoInventario(existencias: number): EstadoInventario {
  if (existencias <= 0) return "agotado";
  return existencias <= UMBRAL_POCAS ? "pocas" : "ok";
}
export const ESTADO_INVENTARIO_LABEL: Record<EstadoInventario, string> = { agotado: "Agotado", pocas: "Pocas", ok: "Con existencias" };

export const MOTIVOS_AJUSTE = ["conteo", "merma", "ajuste"] as const;
export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number];
export const MOTIVO_LABEL: Record<string, string> = {
  inicial: "Existencias iniciales",
  ajuste: "Ajuste",
  conteo: "Conteo físico",
  merma: "Merma o rotura",
  venta: "Venta",
  cancelacion: "Pedido cancelado",
};

/** ¿Esta persona puede cambiar las existencias de este vino? Admin: todos; aliado: solo los suyos; atención: no. */
export function puedeAjustarInventario(user: { rol: string; aliadoId: string | null }, vino: { aliadoId: string }): boolean {
  if (user.rol === "admin") return true;
  return user.rol === "aliado" && !!user.aliadoId && user.aliadoId === vino.aliadoId;
}

/** Cambio con los botones − / + (agrupado): entero distinto de 0 y razonable. */
export function validarCambio(cambio: unknown): number | null {
  return typeof cambio === "number" && Number.isInteger(cambio) && cambio !== 0 && Math.abs(cambio) <= EXISTENCIAS_MAX ? cambio : null;
}

export type FijarInput = { valor: string; motivo: string; nota: string };
export type FijarResultado = { ok: true; data: { valor: number; motivo: MotivoAjuste; nota: string | null } } | { ok: false; errors: Record<string, string> };

/** "Fijar en…": el número exacto de botellas (conteo físico), con motivo y nota opcional. */
export function validarFijar(input: FijarInput): FijarResultado {
  const errors: Record<string, string> = {};
  const limpio = input.valor.trim();
  const valor = /^\d{1,4}$/.test(limpio) ? Number(limpio) : NaN;
  if (!Number.isInteger(valor) || valor < 0 || valor > EXISTENCIAS_MAX) errors.valor = `Escribe un número de botellas entre 0 y ${EXISTENCIAS_MAX}.`;
  if (!(MOTIVOS_AJUSTE as readonly string[]).includes(input.motivo)) errors.motivo = "Elige el motivo.";
  const nota = input.nota.replace(/\s+/g, " ").trim();
  if (nota.length > 200) errors.nota = "Usa máximo 200 caracteres.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { valor, motivo: input.motivo as MotivoAjuste, nota: nota || null } };
}

export type Cruce = "pocas" | "agotado";
/** ¿El cambio cruzó un umbral? Solo al bajar: al llegar a 3 o menos ("pocas") o a 0 ("agotado"). Una vez cada uno. */
export function cruce(antes: number, despues: number): Cruce | null {
  if (despues >= antes) return null;
  if (despues <= 0) return antes > 0 ? "agotado" : null;
  return antes > UMBRAL_POCAS && despues <= UMBRAL_POCAS ? "pocas" : null;
}

export type Faltante = { productoId: string; slug: string; nombre: string; pedidas: number; disponibles: number };
/** Lee el detalle del error sin_existencias de la base ([{producto_id, slug, nombre, pedidas, disponibles}]). */
export function leerFaltantes(detalle: unknown): Faltante[] {
  try {
    const arr = typeof detalle === "string" ? JSON.parse(detalle) : detalle;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.slug === "string")
      .map((x) => ({ productoId: String(x.producto_id ?? ""), slug: x.slug, nombre: String(x.nombre ?? x.slug), pedidas: Number(x.pedidas) || 0, disponibles: Math.max(0, Number(x.disponibles) || 0) }));
  } catch {
    return [];
  }
}

/** Texto para el cliente cuando algo de su carrito ya no alcanza. */
export function textoFaltante(f: Pick<Faltante, "nombre" | "pedidas" | "disponibles">): string {
  if (f.disponibles <= 0) return `${f.nombre} se agotó.`;
  return `${f.nombre}: tienes ${f.pedidas} en tu carrito y ${f.disponibles === 1 ? "queda 1" : `quedan ${f.disponibles}`}.`;
}

/** Tiempo restante "29:41" (nunca negativo). */
export function cuentaRegresiva(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Huella del carrito (kits y botellas, sin importar el orden de las botellas) para saber si cambió. */
export function huellaCarrito(kits: readonly { items: readonly { slug: string; quantity: number }[] }[]): string {
  return kits
    .map((k) => {
      const m = new Map<string, number>();
      for (const i of k.items) m.set(i.slug, (m.get(i.slug) ?? 0) + i.quantity);
      return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([s, q]) => `${s}:${q}`).join(",");
    })
    .join("|");
}
