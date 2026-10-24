import { z } from "zod";
import { hashIp, overHourlyCap } from "@/lib/wine-scan/guard";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/wine-scan/feedback: { scan_id, valor: 1 | -1 } desde los botones "Me sirvió" / "No me sirvió".

const body = z.object({ scan_id: z.uuid(), valor: z.union([z.literal(1), z.literal(-1)]) });

export async function POST(request: Request) {
  if (overHourlyCap(`fb:${hashIp(request)}`)) return Response.json({ ok: false }, { status: 429 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("wine_scans")
    .update({ feedback: parsed.data.valor })
    .eq("id", parsed.data.scan_id);
  if (error) {
    console.error("wine-scan: no se guardó el feedback", error.code);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
