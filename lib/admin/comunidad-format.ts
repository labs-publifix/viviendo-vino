// Formato de Comunidad (/admin/comunidad), sin imports de Next para usarlo igual en el servidor y en las pruebas.

const TZ = "America/Mexico_City";
const dateFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: false });

/** "26 oct 2026 · 09:14" en hora de la Ciudad de México. */
export function fechaCdmx(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${dateFmt.format(d).replace(/\./g, "")} · ${timeFmt.format(d)}`;
}

/** De dónde llegó un registro de la lista de espera (columna source). */
export function origenLabel(source: string | null | undefined, perfiles: Record<string, string>, guias: Record<string, string>): string {
  const s = (source ?? "").trim();
  if (!s) return "Sitio";
  if (s.startsWith("quiz:")) {
    const id = s.slice(5);
    return `Quiz · ${perfiles[id] ?? id}`;
  }
  if (s.startsWith("guia:")) {
    // source se recorta a 40 caracteres: se busca la guía cuyo slug empieza igual.
    const slug = s.slice(5);
    const match = Object.keys(guias).find((k) => k === slug || k.startsWith(slug));
    return `Guía · ${match ? guias[match] : slug}`;
  }
  return `Enlace · ${s}`;
}

export type EstadoEspera = "activa" | "baja" | "compro";
export const ESTADO_LABEL: Record<EstadoEspera, string> = { activa: "Activa", baja: "Se dio de baja", compro: "Ya compró" };

export function estadoEspera(row: { unsubscribed_at?: string | null; purchased_at?: string | null }): EstadoEspera {
  if (row.unsubscribed_at) return "baja";
  if (row.purchased_at) return "compro";
  return "activa";
}

/**
 * CSV para Excel y Google Sheets: BOM UTF-8 (acentos bien en Excel), comillas escapadas y celdas que empiezan con
 * = + - @ o tabulador neutralizadas con un apóstrofo (para que un correo malicioso no se ejecute como fórmula).
 */
export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const cell = (v: string | number | boolean | null | undefined) => {
    let s = v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "Sí" : "No") : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
