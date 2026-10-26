import "server-only";
import { after } from "next/server";
import { createPreviewCookieValue, PREVIEW_COOKIE } from "@/lib/preview-access";
import { siteOrigin } from "./invite";

// Después de guardar en el panel (updateTag ya venció los datos), las páginas pre-armadas de la tienda se
// regeneran con la primera visita, que todavía recibe la versión anterior. Para que esa primera visita ya vea el
// cambio, el servidor visita él mismo las páginas afectadas al terminar la respuesta (after: no hace esperar a
// quien guardó). En dev pasa la contraseña del preview; con la tienda cerrada las visitas reciben 404 y no pasa nada.

export const PAGINAS_CATALOGO = ["/inicio", "/vinos", "/arma-tu-kit"];

export function refrescarTienda(paths: string[]) {
  after(async () => {
    const origin = await siteOrigin();
    const password = process.env.PREVIEW_PASSWORD;
    const headers: Record<string, string> = { cookie: password ? `${PREVIEW_COOKIE}=${createPreviewCookieValue(password)}` : "" };
    await Promise.allSettled([...new Set(paths)].map((p) => fetch(origin + p, { headers, cache: "no-store", signal: AbortSignal.timeout(10000) })));
  });
}
