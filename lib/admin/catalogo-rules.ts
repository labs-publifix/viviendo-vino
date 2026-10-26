// Reglas del Catálogo y de los Aliados en el panel. Puras (sin Next) para usarlas igual en el servidor y en
// las pruebas. Regla de oro (docs/ADMIN.md): todo lo que toca precios solo lo hace un administrador; el rol
// Aliado solo cambia sus vinos entre disponible y agotado.

import type { Rol } from "./rules.ts";

export const TIPOS = ["blanco", "rosado", "tinto", "espumoso"] as const;
export type Tipo = (typeof TIPOS)[number];
export const KIT_BOTELLAS = 6;

/** Lo que cada rol puede cambiar de un vino. */
export function camposEditables(rol: Rol): "todo" | "disponible" | "nada" {
  if (rol === "admin") return "todo";
  if (rol === "aliado") return "disponible";
  return "nada";
}

/** ¿Esta persona puede marcar este vino como disponible o agotado? Admin: todos; aliado: solo los suyos. */
export function puedeCambiarDisponible(user: { rol: Rol; aliadoId: string | null }, vino: { aliadoId: string }): boolean {
  if (user.rol === "admin") return true;
  return user.rol === "aliado" && !!user.aliadoId && user.aliadoId === vino.aliadoId;
}

// ---------- Dinero ----------

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const pesos = (centavos: number) => mxn.format(centavos / 100);

/** "1,234.50" o "$1234" → 123450 centavos; null si no es un precio válido. */
export function precioACentavos(texto: string): number | null {
  const limpio = texto.replace(/[$\s,]/g, "");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(limpio)) return null;
  const centavos = Math.round(Number(limpio) * 100);
  return centavos > 0 ? centavos : null;
}
export const centavosATexto = (c: number) => (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2));

/** Comisión en % ("10" o "12.5") → puntos base (1000 = 10 %). */
export function comisionABps(texto: string): number | null {
  const limpio = texto.replace(/[%\s]/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpio)) return null;
  const bps = Math.round(Number(limpio) * 100);
  return bps >= 0 && bps <= 10000 ? bps : null;
}
export const bpsATexto = (bps: number) => String(bps / 100);

// ---------- Textos ----------

/** "Chardonnay Vento IGT 2024" → "chardonnay-vento-igt-2024". */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const limpiar = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

// ---------- CLABE ----------

/** Valida la CLABE de 18 dígitos con su dígito verificador (pesos 3, 7, 1). */
export function clabeValida(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  const pesos = [3, 7, 1];
  const suma = [...clabe.slice(0, 17)].reduce((s, d, i) => s + ((Number(d) * pesos[i % 3]) % 10), 0);
  return (10 - (suma % 10)) % 10 === Number(clabe[17]);
}

type Errores = Record<string, string>;
type Resultado<T> = { ok: true; data: T } | { ok: false; errors: Errores };

// ---------- Aliado ----------

export type AliadoInput = Record<"nombre" | "ciudad" | "estado" | "comision" | "plazo_dias" | "plazo_texto" | "razon_social" | "rfc" | "contacto_nombre" | "contacto_telefono" | "contacto_email" | "clabe" | "notas", string>;
export type AliadoLimpio = {
  nombre: string;
  ciudad: string | null;
  estado: string | null;
  comision_bps: number;
  plazo_preparacion_dias: number | null;
  plazo_entrega_texto: string | null;
  privados: { razon_social: string | null; rfc: string | null; contacto_nombre: string | null; contacto_telefono: string | null; contacto_email: string | null; clabe: string | null; notas: string | null };
};

export function validarAliado(i: AliadoInput): Resultado<AliadoLimpio> {
  const e: Errores = {};
  const nombre = limpiar(i.nombre);
  if (nombre.length < 2 || nombre.length > 120) e.nombre = "Escribe el nombre de la empresa.";
  const comision = comisionABps(i.comision);
  if (comision === null) e.comision = "Escribe la comisión en %, por ejemplo 10.";
  const dias = limpiar(i.plazo_dias);
  const plazo = dias ? Number(dias) : null;
  if (dias && (!Number.isInteger(plazo) || plazo! < 0 || plazo! > 60)) e.plazo_dias = "Escribe los días como número entero (0 a 60).";
  const plazoTexto = limpiar(i.plazo_texto);
  if (plazoTexto.length > 160) e.plazo_texto = "Usa máximo 160 caracteres.";
  const rfc = limpiar(i.rfc).toUpperCase().replace(/[\s-]/g, "");
  if (rfc && !/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc)) e.rfc = "Revisa el RFC: 12 o 13 caracteres, sin espacios.";
  const clabe = limpiar(i.clabe).replace(/\s/g, "");
  if (clabe && !clabeValida(clabe)) e.clabe = "Revisa la CLABE: son 18 dígitos y el último no coincide.";
  const email = limpiar(i.contacto_email).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.contacto_email = "Revisa el correo.";
  const tel = limpiar(i.contacto_telefono);
  if (tel && !/^[+\d\s()-]{8,20}$/.test(tel)) e.contacto_telefono = "Revisa el teléfono (10 dígitos, puede llevar +52).";
  const notas = String(i.notas ?? "").trim();
  if (notas.length > 2000) e.notas = "Usa máximo 2,000 caracteres.";
  if (Object.keys(e).length) return { ok: false, errors: e };
  const o = (v: string) => v || null;
  return {
    ok: true,
    data: {
      nombre,
      ciudad: o(limpiar(i.ciudad).slice(0, 80)),
      estado: o(limpiar(i.estado).slice(0, 80)),
      comision_bps: comision!,
      plazo_preparacion_dias: plazo,
      plazo_entrega_texto: o(plazoTexto),
      privados: {
        razon_social: o(limpiar(i.razon_social).slice(0, 200)),
        rfc: o(rfc),
        contacto_nombre: o(limpiar(i.contacto_nombre).slice(0, 120)),
        contacto_telefono: o(tel),
        contacto_email: o(email),
        clabe: o(clabe),
        notas: o(notas),
      },
    },
  };
}

// ---------- Vino ----------

export type VinoInput = Record<
  "nombre_oficial" | "productor" | "categoria_slug" | "grupo_id" | "tipo" | "uva" | "region" | "denominacion" | "anada" | "volumen_ml" | "grado_alcohol" | "precio" | "precio_antes" | "premio" | "descripcion" | "descripcion_aliado",
  string
>;
export type VinoLimpio = {
  nombre_oficial: string;
  productor: string;
  categoria_slug: string;
  grupo_id: string;
  tipo: Tipo;
  uva: string | null;
  region: string | null;
  denominacion: string | null;
  anada: number | null;
  volumen_ml: number;
  grado_alcohol: number | null;
  precio_centavos: number;
  /** Precio "antes" (tachado en la tienda). null = sin descuento. */
  precio_antes_centavos: number | null;
  premio: string | null;
  descripcion: string;
  descripcion_aliado: string | null;
};

export function validarVino(i: VinoInput, opciones: { categorias: string[]; grupos: string[] }): Resultado<VinoLimpio> {
  const e: Errores = {};
  const nombre = limpiar(i.nombre_oficial);
  if (nombre.length < 3 || nombre.length > 120) e.nombre_oficial = "Escribe el nombre del vino (como en la etiqueta).";
  const productor = limpiar(i.productor);
  if (productor.length < 2 || productor.length > 80) e.productor = "Escribe el productor.";
  if (!opciones.categorias.includes(i.categoria_slug)) e.categoria_slug = "Elige la categoría.";
  if (!opciones.grupos.includes(i.grupo_id)) e.grupo_id = "Elige el grupo.";
  if (!(TIPOS as readonly string[]).includes(i.tipo)) e.tipo = "Elige el tipo.";
  const anadaTxt = limpiar(i.anada);
  const anada = anadaTxt ? Number(anadaTxt) : null;
  if (anadaTxt && (!Number.isInteger(anada) || anada! < 1900 || anada! > 2100)) e.anada = "Escribe el año de 4 dígitos, o déjalo vacío.";
  const volumen = Number(limpiar(i.volumen_ml) || "750");
  if (!Number.isInteger(volumen) || volumen < 100 || volumen > 6000) e.volumen_ml = "Escribe los mililitros, por ejemplo 750.";
  const gradoTxt = limpiar(i.grado_alcohol).replace(",", ".").replace("%", "");
  const grado = gradoTxt ? Number(gradoTxt) : null;
  if (gradoTxt && (Number.isNaN(grado) || grado! <= 0 || grado! >= 30)) e.grado_alcohol = "Escribe el % de alcohol, por ejemplo 13.5.";
  const precio = precioACentavos(i.precio);
  if (precio === null) e.precio = "Escribe el precio por botella en pesos, por ejemplo 450.";
  const antesTxt = String(i.precio_antes ?? "").trim();
  const antes = antesTxt ? precioACentavos(antesTxt) : null;
  if (antesTxt && antes === null) e.precio_antes = "Escribe el precio antes en pesos, por ejemplo 380, o déjalo vacío.";
  else if (antes !== null && precio !== null && antes <= precio) e.precio_antes = "El precio antes tiene que ser mayor que el precio final; si no hay descuento, déjalo vacío.";
  const descripcion = String(i.descripcion ?? "").trim();
  if (descripcion.length < 20 || descripcion.length > 600) e.descripcion = "Escribe la descripción para la tienda (de 20 a 600 caracteres).";
  const descAliado = String(i.descripcion_aliado ?? "").trim();
  if (descAliado.length > 1000) e.descripcion_aliado = "Usa máximo 1,000 caracteres.";
  if (Object.keys(e).length) return { ok: false, errors: e };
  const o = (v: string) => v || null;
  return {
    ok: true,
    data: {
      nombre_oficial: nombre,
      productor,
      categoria_slug: i.categoria_slug,
      grupo_id: i.grupo_id,
      tipo: i.tipo as Tipo,
      uva: o(limpiar(i.uva).slice(0, 80)),
      region: o(limpiar(i.region).slice(0, 80)),
      denominacion: o(limpiar(i.denominacion).slice(0, 40)),
      anada,
      volumen_ml: volumen,
      grado_alcohol: grado,
      precio_centavos: precio!,
      precio_antes_centavos: antes,
      premio: o(limpiar(i.premio).slice(0, 160)),
      descripcion,
      descripcion_aliado: o(descAliado),
    },
  };
}

// ---------- Kit prearmado ----------

export type KitLinea = { productoId: string; cantidad: number };
type VinoKit = { id: string; grupoId: string; activo: boolean; aliadoId: string };

/** Un kit prearmado: exactamente 6 botellas, del mismo grupo, activas y del aliado del kit. */
export function validarKit(lineas: KitLinea[], vinos: VinoKit[], aliadoId: string): string | null {
  const porId = new Map(vinos.map((v) => [v.id, v]));
  const limpias = lineas.filter((l) => l.cantidad > 0);
  if (!limpias.length) return "Agrega las botellas del kit.";
  if (new Set(limpias.map((l) => l.productoId)).size !== limpias.length) return "Cada vino va una sola vez; sube la cantidad en su renglón.";
  for (const l of limpias) {
    const v = porId.get(l.productoId);
    if (!v || v.aliadoId !== aliadoId) return "Uno de los vinos ya no existe. Recarga la página.";
    if (!v.activo) return "Un kit solo puede llevar vinos visibles en la tienda.";
    if (!Number.isInteger(l.cantidad) || l.cantidad > KIT_BOTELLAS) return "Revisa las cantidades.";
  }
  const total = limpias.reduce((s, l) => s + l.cantidad, 0);
  if (total !== KIT_BOTELLAS) return `El kit lleva ${KIT_BOTELLAS} botellas y ahora suma ${total}.`;
  if (new Set(limpias.map((l) => porId.get(l.productoId)!.grupoId)).size > 1) return "Todas las botellas del kit tienen que ser del mismo grupo.";
  return null;
}
