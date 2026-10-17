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
Las claves secretas (`RESEND_API_KEY`, `SUPABASE_SECRET_KEY`) están marcadas como *Sensitive* y solo existen en Production y Preview.

## Estructura actual

- `site/` — página de "Próximamente" (HTML estático), publicada tal cual por Vercel según `vercel.json`.
- `viviendo-vino-*.{svg,png}` — logos oficiales.
