import "server-only";

// Lectura segura del cuerpo de las peticiones del checkout: tamaño máximo y JSON válido. Nunca registra su contenido
// (lleva datos personales).

export async function leerJson(request: Request, maxBytes: number): Promise<{ ok: true; body: unknown } | { ok: false; status: number }> {
  const raw = await request.text();
  if (raw.length > maxBytes) return { ok: false, status: 413 };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400 };
  }
}

export const ipDe = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
export const NO_STORE = { "Cache-Control": "no-store" };
