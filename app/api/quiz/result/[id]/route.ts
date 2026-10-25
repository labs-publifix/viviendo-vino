import { getQuizCatalog } from "@/lib/quiz/catalog";
import { buildResult } from "@/lib/quiz/result";
import { getStoredSession } from "@/lib/quiz/store";

// GET /api/quiz/result/:id: el resultado guardado, para el enlace compartible. Sin respuestas ni comentario libre;
// nombres, precios, fotos y stock salen de la tienda en el momento de la consulta.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getStoredSession(id);
  if (!session) return Response.json({ ok: false, error: "Este resultado ya no está disponible." }, { status: 404 });
  const store = await getQuizCatalog();
  return Response.json({ ok: true, resultado: buildResult(session, store.info, store.groups, store.presets) });
}
