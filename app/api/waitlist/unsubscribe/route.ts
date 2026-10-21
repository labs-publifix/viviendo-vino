import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyUnsubscribeToken } from "@/lib/tokens";

// GET no da de baja: los filtros de correo abren los enlaces solos. Lleva a /baja para confirmar.
export function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/baja", url.origin);
  const token = url.searchParams.get("token");
  if (token) target.searchParams.set("token", token);
  return Response.redirect(target, 303);
}

// POST: botón de /baja o baja en un clic desde Gmail/Apple Mail (List-Unsubscribe-Post).
export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";
  const token = url.searchParams.get("token") ?? (form?.get("token") as string | null);
  const id = verifyUnsubscribeToken(token);

  let status: "listo" | "invalido" | "error" = "invalido";
  if (id) {
    const { error } = await supabaseAdmin()
      .from("waitlist_signups")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", id)
      .is("unsubscribed_at", null);
    status = error ? "error" : "listo";
    if (error) console.error("waitlist: error al dar de baja", id, error.code);
  }

  if (oneClick) return new Response(null, { status: status === "error" ? 500 : 200 });
  return Response.redirect(new URL(`/baja?estado=${status}`, url.origin), 303);
}
