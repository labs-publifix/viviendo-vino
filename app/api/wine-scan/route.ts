import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { getCandidates } from "@/lib/wine-scan/catalog";
import { PAUSED_MESSAGE, TOO_MANY_MESSAGE, authorizeScan, hashIp, overHourlyCap, scanEnabled } from "@/lib/wine-scan/guard";
import { MATCHING_RULES, grapeName, principleName } from "@/lib/wine-scan/knowledge";
import { recommendFromCatalog } from "@/lib/wine-scan/recommend";
import { runScan, scanModel, type ScanInput, type ScanResult } from "@/lib/wine-scan/scan";
import type { Guide } from "@/lib/wine-scan/schema";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/wine-scan: foto de una etiqueta (multipart "foto", o JSON { imagen: base64 }) o el nombre del vino
// escrito (JSON { texto }). Devuelve la guía, la recomendación opcional y un scan_id.
// La foto se procesa en memoria y se descarta; en wine_scans solo queda el resultado estructurado, sin IP.

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const SESSION = /^[0-9a-f-]{36}$/i;

const jsonBody = z.object({
  imagen: z.string().max(Math.ceil((MAX_BYTES * 4) / 3) + 64).optional(),
  texto: z.string().trim().min(3).max(120).optional(),
  session_id: z.string().optional(),
});

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

const MESSAGES: Record<Exclude<ScanResult, { ok: true }>["reason"], string> = {
  timeout: "La lectura tardó más de lo normal. Intenta de nuevo en un momento.",
  overloaded: "Wine Scan tiene mucha demanda en este momento. Intenta de nuevo en un minuto.",
  refusal: "No se pudo armar una guía con esta imagen. Prueba con otra foto de la etiqueta.",
  invalid: "No se pudo armar la guía esta vez. Intenta de nuevo con otra foto.",
  config: PAUSED_MESSAGE,
  error: "Algo salió mal de nuestro lado. Intenta de nuevo en un momento.",
};

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

async function readInput(request: Request): Promise<{ input: ScanInput; sessionId: string | null } | { error: string }> {
  const type = request.headers.get("content-type") ?? "";
  let image: Buffer | null = null;
  let text: string | undefined;
  let session: string | undefined;

  if (type.startsWith("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return { error: "No se pudo leer la foto. Intenta de nuevo." };
    const file = form.get("foto");
    if (!(file instanceof File)) return { error: "Falta la foto de la etiqueta." };
    if (file.size > MAX_BYTES) return { error: "La foto pesa demasiado. Intenta de nuevo." };
    image = Buffer.from(await file.arrayBuffer());
    session = String(form.get("session_id") ?? "");
  } else {
    const parsed = jsonBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return { error: "No se pudo leer tu solicitud. Escribe entre 3 y 120 caracteres o toma una foto." };
    session = parsed.data.session_id;
    text = parsed.data.texto;
    if (parsed.data.imagen) image = Buffer.from(parsed.data.imagen.replace(/^data:image\/jpeg;base64,/, ""), "base64");
  }

  const sessionId = session && SESSION.test(session) ? session.toLowerCase() : null;
  if (image) {
    if (image.length > MAX_BYTES) return { error: "La foto pesa demasiado. Intenta de nuevo." };
    if (!isJpeg(image)) return { error: "La foto debe ser una imagen JPEG. Intenta de nuevo desde la cámara." };
    return { input: { kind: "image", jpegBase64: image.toString("base64") }, sessionId };
  }
  if (text) return { input: { kind: "text", query: text.replace(/[<>]/g, "") }, sessionId };
  return { error: "Toma una foto de la etiqueta o escribe el nombre del vino." };
}

/** Lo que ve el navegador: la guía con los nombres de los principios y la temperatura como [min, max]. */
function publicGuide(g: Guide) {
  const { temperatura_min_c, temperatura_max_c, ...servicio } = g.servicio;
  return {
    ...g,
    servicio: { ...servicio, temperatura_c: [temperatura_min_c, temperatura_max_c] as [number, number] },
    maridajes: g.maridajes.map((m) => ({ ...m, principio: principleName(m.principio_id) })),
    identificacion: { ...g.identificacion, uvas_nombres: g.identificacion.uvas.map(grapeName) },
  };
}

async function recommendation(g: Guide) {
  if (g.accion !== "ok" || g.identificacion.confianza === "baja") return null;
  const { candidates, wines } = await getCandidates();
  const id = g.identificacion;
  const rec = recommendFromCatalog(
    {
      grupo: id.grupo,
      perfil: g.perfil_estimado,
      uvas: id.uvas,
      pais: id.pais,
      metodo_espumoso: id.metodo_espumoso,
      texto: [id.nombre_vino, id.denominacion].filter(Boolean).join(" "),
    },
    candidates,
    MATCHING_RULES,
    grapeName,
  );
  if (!rec) return null;
  const wine = wines.get(rec.slug)!;
  const profile = candidates.find((c) => c.slug === rec.slug)!;
  return {
    slug: rec.slug,
    nombre: wine.name,
    precio_centavos: wine.priceCents,
    imagen_url: wine.imageUrl,
    argumento: profile.argumento,
    razon: rec.razon,
    similitud: rec.score,
    estilo_distinto: rec.estiloDistinto,
    aviso_nobile: rec.avisoNobile,
    enlace: `/arma-tu-kit?vino=${rec.slug}`,
  };
}

export async function POST(request: Request) {
  if (!scanEnabled()) return fail(503, PAUSED_MESSAGE);
  if (overHourlyCap(hashIp(request))) return fail(429, TOO_MANY_MESSAGE);
  const auth = await authorizeScan(request);
  if (!auth.allowed) return fail(403, auth.message);

  const read = await readInput(request);
  if ("error" in read) return fail(400, read.error);

  const started = Date.now();
  const result = await runScan(read.input);
  const latency = Date.now() - started;
  const scanId = randomUUID();

  if (!result.ok) {
    after(() => record(scanId, read.sessionId, null, null, result, latency));
    return fail(result.reason === "config" ? 503 : 502, MESSAGES[result.reason]);
  }

  const guide = result.guide;
  let rec: Awaited<ReturnType<typeof recommendation>> = null;
  try {
    rec = await recommendation(guide);
  } catch (err) {
    // Sin catálogo no hay recomendación, pero la guía sigue siendo útil.
    console.error("wine-scan: no se pudo leer el catálogo", err instanceof Error ? err.message : err);
  }

  after(() => record(scanId, read.sessionId, guide, rec, result, latency));
  return Response.json({ ok: true, scan_id: scanId, guia: publicGuide(guide), recomendacion: rec });
}

async function record(
  id: string,
  sessionId: string | null,
  guide: Guide | null,
  rec: { slug: string; similitud: number } | null,
  result: ScanResult,
  latency: number,
) {
  try {
    const ident = guide?.identificacion;
    const detected = ident && guide?.accion === "ok" ? [ident.productor, ident.nombre_vino, ident.anada].filter(Boolean).join(" ") || null : null;
    const { error } = await supabaseAdmin()
      .from("wine_scans")
      .insert({
        id,
        session_id: sessionId,
        vino_detectado: detected,
        grupo: guide?.accion === "ok" ? ident?.grupo : null,
        confianza: guide?.accion === "ok" ? ident?.confianza : null,
        accion: guide?.accion ?? `error:${result.ok ? "" : result.reason}`,
        // Se guardan los ajustes de calibración para revisar qué tanto infla la IA cada eje.
        resultado: guide ? { ...guide, calibracion: result.ok ? result.ajustes : [] } : null,
        slug_recomendado: rec?.slug ?? null,
        similitud: rec?.similitud ?? null,
        modelo: result.model || scanModel(),
        tokens_entrada: result.usage.input,
        tokens_salida: result.usage.output,
        tokens_cache: result.usage.cacheRead,
        tokens_cache_escritura: result.usage.cacheWrite,
        latencia_ms: latency,
      });
    if (error) console.error("wine-scan: no se guardó el escaneo", error.code);
  } catch (err) {
    console.error("wine-scan: no se guardó el escaneo", err instanceof Error ? err.message : err);
  }
}
