import "server-only";
import { LAUNCH_AT_MS } from "@/lib/launch";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AdminUser } from "./session";

// Inicio del panel: una sola llamada a admin_inicio (20261103000000_inicio.sql, actualizada en 20261104000000_broker.sql), que devuelve las cifras ya
// calculadas en la base. El aliado solo recibe lo suyo; qué partes ve cada rol lo decide la página.

type Monto = { n: number; total: number; aliado: number; comision?: number; mp?: number };

export type Inicio = {
  pedidos: { por_preparar: number; atrasados: number; en_camino: number; entregados_hoy: number; sin_pago: number };
  atrasados: { id: string; folio: string; estado: string; desde: string; horas: number; ciudad: string; estado_mx: string; prueba: boolean }[];
  ventas: { hoy: Monto; semana: Monto; mes: Monto };
  serie: { dia: string; n: number; total: number; aliado: number }[];
  aliados: { id: string; nombre: string; por_transferir: number; en_camino: number; ultima_transferencia: string | null }[];
  catalogo: { agotados: number; ocultos: number; vinos: number };
  comunidad: {
    lista_total: number;
    lista_semana: number;
    quiz_semana: number;
    scans_semana: number;
    guias_semana: number;
    correos_fallidos_semana: number;
    anuncios_activos: number;
  } | null;
};

export type InicioResultado = { datos: Inicio | null; faltaSql: boolean; ahora: number; diasParaAbrir: number | null };

export async function getInicio(user: AdminUser): Promise<InicioResultado> {
  const ahora = Date.now();
  const diasParaAbrir = ahora < LAUNCH_AT_MS ? Math.ceil((LAUNCH_AT_MS - ahora) / 86400000) : null;
  if (user.rol === "aliado" && !user.aliadoId) return { datos: null, faltaSql: false, ahora, diasParaAbrir };
  const { data, error } = await supabaseAdmin().rpc("admin_inicio", { p_aliado: user.rol === "aliado" ? user.aliadoId : null });
  if (error) {
    console.error("admin/inicio: no se pudo leer el tablero", error.code);
    // PGRST202 / 42883: la función aún no existe (falta correr su SQL).
    if (error.code === "PGRST202" || error.code === "42883") return { datos: null, faltaSql: true, ahora, diasParaAbrir };
    throw new Error("No se pudo leer el tablero.");
  }
  // Los conteos de Postgres pueden llegar como texto: se normalizan a número.
  const num = (x: unknown) => Number(x ?? 0);
  const d = data as Inicio;
  return {
    faltaSql: false,
    ahora,
    diasParaAbrir,
    datos: {
      ...d,
      pedidos: Object.fromEntries(Object.entries(d.pedidos).map(([k, v]) => [k, num(v)])) as Inicio["pedidos"],
      atrasados: d.atrasados.map((a) => ({ ...a, horas: num(a.horas) })),
      ventas: Object.fromEntries(Object.entries(d.ventas).map(([k, m]) => [k, Object.fromEntries(Object.entries(m).map(([kk, vv]) => [kk, num(vv)]))])) as Inicio["ventas"],
      serie: d.serie.map((s) => ({ dia: String(s.dia).slice(0, 10), n: num(s.n), total: num(s.total), aliado: num(s.aliado) })),
      aliados: d.aliados.map((a) => ({ ...a, por_transferir: num(a.por_transferir), en_camino: num(a.en_camino), ultima_transferencia: a.ultima_transferencia ? String(a.ultima_transferencia).slice(0, 10) : null })),
      catalogo: { agotados: num(d.catalogo.agotados), ocultos: num(d.catalogo.ocultos), vinos: num(d.catalogo.vinos) },
      comunidad: d.comunidad ? (Object.fromEntries(Object.entries(d.comunidad).map(([k, v]) => [k, num(v)])) as Inicio["comunidad"]) : null,
    },
  };
}
