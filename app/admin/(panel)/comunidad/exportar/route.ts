import { audit } from "@/lib/admin/audit";
import { getEspera, getGuiasPedidas, getQuizGuardados } from "@/lib/admin/comunidad";
import { toCsv } from "@/lib/admin/comunidad-format";
import { getAdmin } from "@/lib/admin/session";

// Exportación CSV de Comunidad. Solo admin; cada descarga queda en la auditoría (son datos personales).
export async function GET(request: Request) {
  const user = await getAdmin();
  if (!user || user.rol !== "admin") return new Response("No autorizado", { status: 403 });
  const lista = new URL(request.url).searchParams.get("lista");

  let headers: string[];
  let rows: (string | number | boolean)[][];
  if (lista === "espera") {
    const data = await getEspera();
    headers = ["Correo", "Le interesa", "Llegó por", "Se anotó (CDMX)", "Correos recibidos", "Estado"];
    rows = data.map((r) => [r.email, r.gustos, r.origen, r.fecha, r.correos, r.estadoLabel]);
  } else if (lista === "quiz") {
    const data = await getQuizGuardados();
    headers = ["Correo", "Perfil", "Acepta novedades", "Correo enviado", "Fecha (CDMX)"];
    rows = data.map((r) => [r.email, r.perfil, r.novedades, r.enviado, r.fecha]);
  } else if (lista === "guias") {
    const data = await getGuiasPedidas();
    headers = ["Correo", "Guía", "Acepta novedades", "Correo enviado", "Fecha (CDMX)"];
    rows = data.map((r) => [r.email, r.guia, r.novedades, r.enviado, r.fecha]);
  } else {
    return new Response("Lista no válida", { status: 400 });
  }

  await audit(user, "exportar", "comunidad", lista, null, { filas: rows.length });
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
  const nombre = { espera: "lista-de-espera", quiz: "quiz", guias: "guias" }[lista];
  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="viviendo-vino-${nombre}-${fecha}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
