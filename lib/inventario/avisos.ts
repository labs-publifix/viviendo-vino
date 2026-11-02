import "server-only";
import { Resend } from "resend";
import { renderAvisoInventario } from "@/lib/email/inventario";
import { registrarCorreo } from "@/lib/email/registro";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cruce } from "./rules";

// Avisos de inventario: cuando una venta o un ajuste deja un vino en 3 botellas o menos, o en 0, se avisa por
// correo a los administradores y a la gente del aliado de ese vino. Se llama con after() (no hace esperar).
// Cada envío queda en correos_enviados; en el log nunca va el correo de nadie.

export type Cambio = { productoId: string; antes: number; despues: number };

export async function avisarUmbrales(cambios: Cambio[], origen: string): Promise<void> {
  const cruces = cambios.flatMap((c) => {
    const k = cruce(c.antes, c.despues);
    return k ? [{ ...c, cruce: k }] : [];
  });
  if (!cruces.length) return;
  const db = supabaseAdmin();
  const [{ data: vinos }, { data: equipo }] = await Promise.all([
    db.from("productos").select("id, nombre_oficial, aliado_id").in("id", cruces.map((c) => c.productoId)),
    db.from("admin_usuarios").select("email, rol, aliado_id").eq("activo", true),
  ]);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  for (const c of cruces) {
    const vino = vinos?.find((v) => v.id === c.productoId);
    if (!vino) continue;
    const para = [...new Set((equipo ?? []).filter((u) => u.rol === "admin" || (u.rol === "aliado" && u.aliado_id === vino.aliado_id)).map((u) => u.email as string))];
    const correo = renderAvisoInventario({ cruce: c.cruce, vino: vino.nombre_oficial, existencias: c.despues, panelUrl: `${origen}/admin/catalogo/vinos/${vino.id}` });
    const tipo = c.cruce === "agotado" ? "inventario_agotado" : "inventario_pocas";
    for (const to of para) {
      let resultado: { id?: string | null; error?: string | null };
      if (!apiKey || !from) resultado = { error: "sin_configuracion" };
      else {
        try {
          const { data, error } = await new Resend(apiKey).emails.send({ from, to, ...correo });
          resultado = error ? { error: error.name } : { id: data?.id ?? null };
        } catch (e) {
          resultado = { error: e instanceof Error ? e.name : "error" };
        }
      }
      if (resultado.error) console.error(`inventario: no se mandó el aviso (${tipo})`, resultado.error);
      await registrarCorreo({ tipo, para: "equipo", destinatario: to, asunto: correo.subject, referencia: vino.nombre_oficial, resultado });
    }
  }
}
