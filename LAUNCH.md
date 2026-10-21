# Lanzamiento de la tienda

La tienda **no** abre sola al llegar la fecha. Abrir es una decisión manual: cambiar `STORE_OPEN` a `true` en Production y redesplegar. Hasta entonces www.viviendovino.com solo muestra la lista de espera y cualquier ruta de la tienda responde 404.

## Cómo funciona el interruptor

- `proxy.ts` + `lib/gate.ts`. Con `STORE_OPEN` distinto de `"true"` solo responden las rutas de la lista de espera (lista blanca en `lib/gate.ts`); todo lo demás da el mismo 404 que una ruta inventada.
- Con `STORE_OPEN=true`, `/` muestra la portada de la tienda (`/inicio` por dentro) y el resto de rutas de la tienda quedan públicas.
- Pruebas: `npm test` (lógica) y `npm run test:gate` contra un servidor en marcha (ver `scripts/check-gate.mjs`).

## Entornos

| Variable | Production | Preview (rama `develop` → dev.viviendovino.com) |
|---|---|---|
| `STORE_OPEN` | `false` hasta el lanzamiento | `true` |
| `NEXT_PUBLIC_PREVIEW` | *(no definir)* | `true` |
| `PREVIEW_PASSWORD` | *(no definir)* | contraseña del equipo (Secret) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | proyecto de producción | proyecto de **staging** |
| Mercado Pago (fase de pagos) | credenciales de producción | credenciales de prueba |

`NEXT_PUBLIC_PREVIEW` se lee al compilar: cambiarla exige redesplegar.

## Checklist del día de apertura

### Antes (días previos)
- [ ] Decisiones que bloquean el lanzamiento resueltas (licencia y vendedor, tratamiento fiscal, zonas y plazos de entrega; Fundamentos §15).
- [ ] Textos legales revisados por el abogado (términos, privacidad, envíos, devoluciones) y leyenda de consumo responsable confirmada.
- [ ] Migraciones de la base aplicadas en **producción** y catálogo cargado (`supabase/migrations/`), revisando precios contra `catalogo-inicial.json`.
- [ ] Mercado Pago: credenciales de **producción** en Vercel (Production), cuenta de Rafael verificada, pagos a meses desactivados, webhook apuntando a www.viviendovino.com.
- [ ] Resend: plan con capacidad suficiente para el día de lanzamiento.
- [ ] Prueba de compra real en producción con un pedido pequeño, y su reembolso.
- [ ] Fotos de producto cargadas o placeholders aprobados.
- [ ] Revisar que la secuencia de correos (4, 5 y 6) lleve a la tienda y que la tienda marque `purchased_at` en `waitlist_signups`.

### La mañana de la apertura (jueves 19 de noviembre, antes de las 9:00 am)
- [ ] Vercel → Environment Variables → `STORE_OPEN` = `true` en **Production**.
- [ ] Deployments → último despliegue de Production → **Redeploy**.
- [ ] Abrir www.viviendovino.com: debe mostrar la tienda. Recorrer catálogo → armador → carrito → checkout.
- [ ] Revisar `robots.txt` y `sitemap.xml` (deben incluir la tienda).
- [ ] Quitar la protección de dev.viviendovino.com solo si se decide retirarlo; si se queda, sigue con contraseña y noindex.
- [ ] DNS sin cambios: www y el dominio raíz ya apuntan a Vercel.

### Volver a cerrar (emergencia)
- `STORE_OPEN` = `false` en Production → Redeploy. La lista de espera vuelve a `/`.
