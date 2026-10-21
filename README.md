# Viviendo Vino

E-commerce de Viviendo Vino: tienda en línea de kits exclusivos de vino.

**Producción:** https://www.viviendovino.com

## Infraestructura

| Servicio | Uso | Notas |
|---|---|---|
| **Vercel** | Hosting y deploys | Cada push a `main` se publica en producción. Las demás ramas generan una vista previa. |
| **GoDaddy** | Dominio `viviendovino.com` | DNS: `A @` y `CNAME www` → Vercel; registros de Resend (`resend._domainkey`, `send`, `rsend`). El apex redirige a `www`. |
| **Supabase** | Base de datos y autenticación | Región East US (North Virginia). |
| **Resend** | Correos transaccionales | Dominio `viviendovino.com` verificado, región us-east-1. |

## Variables de entorno

Viven en Vercel (Settings → Environment Variables), nunca en el repo. Ver [`.env.example`](.env.example).
Las claves secretas (`RESEND_API_KEY`, `SUPABASE_SECRET_KEY`, `WAITLIST_TOKEN_SECRET`) están marcadas como *Sensitive* y solo existen en Production y Preview.

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_LAUNCH_AT` | Apertura de la tienda (`2026-11-19T09:00:00-06:00`). La ventana del regalo se calcula como +48 h. |
| `NEXT_PUBLIC_SITE_URL` | URL pública, usada en correos y Open Graph. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend. |
| `WAITLIST_TOKEN_SECRET` | Firma de los enlaces de baja (≥ 32 caracteres aleatorios). |

## Estructura

Next.js (App Router) + TypeScript.

- `app/page.tsx` — home temporal: lista de espera con cuenta regresiva (`app/_waitlist/`).
- `app/api/waitlist/route.ts` — `POST`: valida, guarda en Supabase y envía el correo de confirmación.
- `app/api/waitlist/unsubscribe/route.ts` — baja con token firmado (`GET` lleva a `/baja` para confirmar; `POST` da de baja, incluido el one-click de Gmail).
- `lib/email/confirmation.ts` — correo 1 (HTML con tablas + texto plano).
- `lib/launch.ts` — todas las fechas se derivan de `NEXT_PUBLIC_LAUNCH_AT`.
- `supabase/migrations/` — esquema de la base de datos.
- `public/brand/`, `public/email/` — logos para el sitio y para los correos.

## Lista de espera

### Crear la tabla
En Supabase → **SQL Editor**, pega y ejecuta `supabase/migrations/20261021000000_waitlist_signups.sql`.

### Exportar la lista
Supabase → **Table Editor** → `waitlist_signups` → **Export → Download as CSV**. Para excluir bajas, usa el SQL Editor:

```sql
select email, wine_types, source, created_at
from waitlist_signups
where unsubscribed_at is null
order by created_at;
```
y descarga el resultado como CSV.

### Anti-spam
- Campo trampa oculto y tiempo mínimo de llenado (2.5 s): si se activan, se responde éxito sin guardar.
- Límite por IP en memoria (8 intentos / 10 min por instancia). En serverless cada instancia lleva su propio contador, así que el límite real debe ir en **Vercel → Firewall → Rate Limiting**: regla para `POST /api/waitlist`, por IP, 10 solicitudes por minuto, acción *Deny* (429).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run dev
npm run lint && npm run build
```
