import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { TipoCorreo } from "./tipos";

export { CORREO_LABEL, type TipoCorreo } from "./tipos";

// Registro de cada correo que sale (tabla correos_enviados): lo ven el historial de cada pedido y /admin/correos.
// Nunca frena ni rompe un envío: si no se puede guardar, solo se avisa en el log (sin el correo de nadie).

export type RegistroCorreo = {
  tipo: TipoCorreo;
  para: "cliente" | "equipo";
  destinatario: string;
  asunto: string;
  pedidoId?: string | null;
  referencia?: string | null;
  /** Lo que respondió Resend: su id si lo aceptó, o el nombre del error. */
  resultado: { id?: string | null; error?: string | null };
  reenvio?: boolean;
  usuarioId?: string | null;
};

export async function registrarCorreo(r: RegistroCorreo): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from("correos_enviados")
      .insert({
        tipo: r.tipo,
        para: r.para,
        destinatario: r.destinatario.slice(0, 254),
        asunto: r.asunto.slice(0, 200),
        pedido_id: r.pedidoId ?? null,
        referencia: r.referencia?.slice(0, 120) ?? null,
        estado: r.resultado.error ? "fallo" : "enviado",
        proveedor_id: r.resultado.id?.slice(0, 120) ?? null,
        error: r.resultado.error?.slice(0, 120) ?? null,
        reenvio: r.reenvio ?? false,
        usuario_id: r.usuarioId ?? null,
      });
    if (error) console.error("correos: no se registró el envío", r.tipo, error.code);
  } catch (e) {
    console.error("correos: no se registró el envío", r.tipo, e instanceof Error ? e.message : "error");
  }
}
