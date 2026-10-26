// Marquesina de la tienda (Manual · 10.04): mensajes editables desde /admin/anuncios, con orden, encendido y
// programación opcional. Puro (sin Next) para usarlo igual en la tienda, en el panel y en las pruebas.

export type Anuncio = {
  id: string;
  texto: string;
  /** Ruta de la tienda ("/arma-tu-kit") o enlace https. Opcional. */
  enlace: string | null;
  orden: number;
  activo: boolean;
  /** Programación (ISO, UTC). null = sin límite. */
  iniciaAt: string | null;
  terminaAt: string | null;
};
export type AnuncioPublico = Pick<Anuncio, "texto" | "enlace">;

export const TEXTO_MAX = 90;
export const MAX_ANUNCIOS = 12;

/** Los mensajes que había fijos en el código (26 oct 2026). Respaldo si la base no responde. */
export const ANUNCIOS_RESPALDO: AnuncioPublico[] = [
  { texto: "Kits de 6 botellas con envío incluido", enlace: null },
  { texto: "Arma tu kit desde $1,800", enlace: null },
  { texto: "Vino italiano de Véneto, Piamonte, Abruzzo y Puglia", enlace: null },
  { texto: "Repite las botellas que quieras", enlace: null },
  { texto: "Cómo funciona", enlace: "/#como-funciona" },
];

export type Estado = "visible" | "programado" | "terminado" | "apagado";

export function estado(a: Pick<Anuncio, "activo" | "iniciaAt" | "terminaAt">, now: number): Estado {
  if (!a.activo) return "apagado";
  if (a.terminaAt && Date.parse(a.terminaAt) <= now) return "terminado";
  if (a.iniciaAt && Date.parse(a.iniciaAt) > now) return "programado";
  return "visible";
}

/** Lo que la tienda muestra ahora, en orden. */
export function visibles(list: Anuncio[], now: number): AnuncioPublico[] {
  return [...list]
    .sort((a, b) => a.orden - b.orden)
    .filter((a) => estado(a, now) === "visible")
    .map(({ texto, enlace }) => ({ texto, enlace }));
}

/** Segundos hasta el próximo inicio o fin programado (para que el caché de la tienda se renueve a tiempo). */
export function segundosAlSiguienteCambio(list: Anuncio[], now: number): number | null {
  let next = Infinity;
  for (const a of list) {
    if (!a.activo) continue;
    for (const t of [a.iniciaAt, a.terminaAt]) {
      const ms = t ? Date.parse(t) : NaN;
      if (ms > now && ms < next) next = ms;
    }
  }
  return next === Infinity ? null : Math.ceil((next - now) / 1000);
}

// ---------- Hora de la Ciudad de México ----------

const TZ = "America/Mexico_City";
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function offsetMs(utcMs: number): number {
  const p = Object.fromEntries(parts.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(utcMs / 60000) * 60000;
}

/** "2026-11-19T09:00" (lo que da un <input type="datetime-local">, en hora de CDMX) → ISO en UTC. */
export function cdmxAIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const utc = guess - offsetMs(guess);
  // Segunda pasada por si la primera cayó del otro lado de un cambio de horario.
  return new Date(guess - offsetMs(utc)).toISOString();
}

/** ISO → "2026-11-19T09:00" en hora de CDMX, para precargar un <input type="datetime-local">. */
export function isoACdmx(iso: string | null): string {
  if (!iso) return "";
  const p = Object.fromEntries(parts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const legible = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** "jue 19 de nov, 09:00" en hora de CDMX. */
export function fechaCorta(iso: string): string {
  return legible.format(new Date(iso)).replace(/\./g, "");
}

// ---------- Validación ----------

/** Enlace permitido: ruta de la tienda o https. Devuelve el enlace limpio, null si va vacío o "invalido". */
export function limpiarEnlace(value: string): string | null | "invalido" {
  const v = value.trim();
  if (!v) return null;
  if (v.length > 300) return "invalido";
  if (/^\/(?!\/)[A-Za-z0-9\-._~/#?=&%]*$/.test(v)) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : "invalido";
  } catch {
    return "invalido";
  }
}

export type AnuncioInput = { texto: string; enlace: string; inicia: string; termina: string };
export type AnuncioLimpio = { texto: string; enlace: string | null; iniciaAt: string | null; terminaAt: string | null };

/** Revisa lo que llega del formulario. Errores por campo, en el tono de la marca. */
export function validarAnuncio(input: AnuncioInput): { ok: true; data: AnuncioLimpio } | { ok: false; errors: Partial<Record<keyof AnuncioInput, string>> } {
  const errors: Partial<Record<keyof AnuncioInput, string>> = {};
  const texto = input.texto.replace(/\s+/g, " ").trim();
  if (texto.length < 3) errors.texto = "Escribe el mensaje.";
  else if (texto.length > TEXTO_MAX) errors.texto = `Usa máximo ${TEXTO_MAX} caracteres; en la barra se lee mejor corto.`;

  const enlace = limpiarEnlace(input.enlace);
  if (enlace === "invalido") errors.enlace = "Usa una ruta de la tienda que empiece con / (por ejemplo /arma-tu-kit) o un enlace https.";

  const iniciaAt = input.inicia ? cdmxAIso(input.inicia) : null;
  const terminaAt = input.termina ? cdmxAIso(input.termina) : null;
  if (input.inicia && !iniciaAt) errors.inicia = "Revisa la fecha de inicio.";
  if (input.termina && !terminaAt) errors.termina = "Revisa la fecha de fin.";
  if (iniciaAt && terminaAt && Date.parse(terminaAt) <= Date.parse(iniciaAt)) errors.termina = "El fin tiene que ser después del inicio.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { texto, enlace: enlace as string | null, iniciaAt, terminaAt } };
}
