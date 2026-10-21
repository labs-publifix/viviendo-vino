// ¿Este despliegue sirve la tienda? Producción con la tienda cerrada no la sirve (proxy.ts responde 404)
// y su base todavía no tiene el catálogo: las páginas de la tienda no deben ni consultarla al compilar.
// STORE_OPEN se lee al compilar aquí; abrir o cerrar la tienda ya exige redesplegar (LAUNCH.md).
export function storeEnabled(): boolean {
  if (process.env.STORE_OPEN === "true" || process.env.NEXT_PUBLIC_PREVIEW === "true") return true;
  return process.env.VERCEL_ENV !== "production";
}
