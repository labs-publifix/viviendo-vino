# Pendientes abiertos

Lo que falta confirmar o conseguir para la tienda. Se actualiza en cada ronda.

## Catálogo y fichas
- [ ] **Langhe Nebbiolo (Fiorella Bertino):** el PDF del aliado no trae nota de cata (solo la filosofía de Cantina Bertino). La ficha sale con una descripción mínima hasta que el aliado mande la ficha de cata.
- [ ] **Bodega Rocca, asignación inferida:** el PDF titula los textos "Sangiovese Primitivo Puglia" y "Primitivo Salento". Se asignaron al Sangiovese Puglia IGT 2024 y al Primitivo 2025 respectivamente; confirmar con el aliado.
- [ ] Concurso y año del premio "Double Gold" de los dos vinos Rocca.
- [ ] Tipo, uva, región, denominación y añada de cada vino: deducidos del nombre (`data/catalogo-marca.json`); confirmar con el aliado. Uva sin dato en Soave, Don Carlo, Ripasso, Amarone y Rosé 921 (mezclas o sin información); Glera del Prosecco deducida por denominación.
- [ ] Nombre y razón social del aliado (hoy "Aliado de Córdoba", provisional).
- [ ] Revisar las 19 descripciones reescritas en voz de marca (`data/catalogo-marca.json`) y los 3 kits prearmados propuestos (Blancos frescos, Tintos de diario, Burbujas).
- [ ] Grado alcohólico y volumen de cada etiqueta.
- [x] Fotografías de producto: las 19 en `public/img/vinos/` (originales en `fotos-vinos/`).
- [ ] Al tener panel de administración: mover las fotos al almacenamiento de Supabase. Las imágenes de grupos y kits prearmados (`lib/catalog/media.ts`, generadas con `npm run home-images:build`) pasan a columnas de la base; un kit prearmado nuevo hoy sale sin foto.

## Tienda en el preview
- [x] Armador (`/arma-tu-kit`) y carrito (`/carrito`), con validación en el servidor.
- [x] Checkout sin pago (`/checkout`): datos de contacto, entrega, mayoría de edad, factura y aceptaciones; el servidor revisa todo y no guarda nada. Botón de pago desactivado: "Pagos disponibles pronto".
- [ ] Checkout, fase de pagos: validar cobertura por código postal (K-07), opción "Es un regalo" con mensaje (P1), guardar fecha, hora y versión de las aceptaciones.

## Textos legales e informativos (borradores)
Las páginas `/envios`, `/preguntas-frecuentes`, `/terminos` y `/privacidad` llevan el aviso "Borrador pendiente de revisión legal" y marcan en amarillo cada dato faltante:
- [ ] Razón social y domicilio de Viviendo Vino y del aliado.
- [ ] Zonas y códigos postales con cobertura; plazos de preparación y entrega.
- [ ] Requisitos al recibir (identificación) y qué pasa si nadie recibe.
- [ ] Cancelaciones, devoluciones, reposición por daño y reembolsos (incluye quién absorbe la comisión de Mercado Pago).
- [ ] Impuestos incluidos en el precio.
- [ ] Aviso de privacidad: responsable, transferencias, ubicación de servidores, procedimiento y plazo ARCO.
- [ ] Legislación aplicable y tribunales.
- [ ] Número de WhatsApp de atención.
- [ ] Refresco inmediato del catálogo: hoy un cambio hecho por SQL (precio, foto, stock) tarda en verse y la primera visita a cada página puede mostrar la versión anterior (al navegar del catálogo a una ficha se ve la ficha vieja hasta recargar). Es el caché de la tienda (`cacheLife("minutes")`), no un error de datos. Solución: el panel de administración invalida el caché al guardar (`revalidateTag("catalogo", { expire: 0 })`); antes, opcional, un webhook de Supabase que haga lo mismo.
- [ ] Al conectar pagos: el pedido debe leer precios sin caché (hoy la validación usa el catálogo cacheado ~1 minuto).

## Grupos
- [ ] Correr `supabase/seed/grupos-editoriales.sql` en **producción** antes de abrir (en staging ya se corre en esta ronda). Si se corre `catalogo-completo.sql` completo, ya incluye los nombres nuevos.

## Descubrir (Quiz IA, Wine Scan, Nosotros, Blog)
- [x] `/nosotros` construida (con placeholders de contenido de Rafa).
- [ ] Páginas `/quiz` y `/wine-scan` son provisionales (título, una línea y regreso al inicio); se reemplazan al construir cada función.
- [ ] Contenido de Rafa (portada y `/nosotros`), todo en `lib/about.ts`. Mientras falte, dev muestra un placeholder y producción no muestra esa pieza:
  - [x] `RAFA_PHOTO`: foto de Rafa (`public/img/rafa.webp`).
  - `RAFA_STORY`: su historia con el vino, con sus palabras.
  - `RAFA_QUOTE`: una frase suya.
  - `RAFA_CRITERIA`: 3 o 4 criterios reales con los que elige cada vino (título y una línea).
- [ ] Feed de Instagram en `/nosotros`: requiere conectar la API de Instagram (fase de funcionalidades). Hoy hay un espacio reservado solo en dev.
- [x] Blog construido: `/blog`, `/blog/[slug]` y el teaser de la portada leen `content/blog/*.md` (guía en `content/blog/README.md`, backlog en `content/blog/BACKLOG.md`).
- [ ] Los 3 artículos actuales son de **ejemplo** (`ejemplo: true`, etiqueta visible solo en dev). Reemplazarlos o quitarles la marca al revisarlos.
- [x] Plantilla de marca para las guías en PDF (`npm run guides:build`, guía en `content/blog/README.md`). Muestra: `public/guias/temperatura-de-servicio.pdf`; falta tu visto bueno.
- [x] Descarga de guías por correo: `/api/guias` valida en servidor, guarda en `guide_requests` y envía el PDF con Resend (plantilla de marca; vista previa en `/correos?correo=guia`). Quien marca "novedades" entra a `waitlist_signups` con source `guia:<slug>`.
- [ ] **Correr en Supabase** `supabase/migrations/20261024000000_guide_requests.sql`: primero staging, luego producción. Sin esa tabla el formulario de la guía responde con error.
- [x] Blog real: backlog en `content/blog/BACKLOG.md` (Excel en `docs/`), publicación programada los jueves 9:00 am CDMX sin cron, title tag, canonical, JSON-LD (Article, BreadcrumbList, FAQPage), sitemap con artículos visibles. Piezas 01 a 06 en revisión en dev.
- [ ] 19 nov: dar de alta Search Console, enviar el sitemap y pedir indexación de 01 a 07 (backlog §4).
- [ ] GA4 y sus eventos (descarga de guía, clic al armador, quiz y Wine Scan): pendiente, no hay GA4 instalado.
- [ ] Índice del blog paginado y RSS: no hacen falta con menos de 30 artículos; se agregan cuando crezca.
- [ ] Confirmar con quien corresponda la leyenda de consumo responsable (hoy "Evita el exceso · Venta solo a mayores de 18 años").

## Portada
- [ ] Textos de la marquesina de anuncios: hoy son de muestra (`app/(tienda)/(sitio)/layout.tsx`).
- [ ] Ilustración del hero en mayor resolución (ideal 2560 × 1440): la actual mide 1280 × 720.
- [ ] Etiqueta del hero "Vinos exclusivos de Viviendo Vino": la guía de voz (PRODUCT.md) pide evitar "exclusivo"; se usó por decisión del equipo (23 oct). Confirmar.
- [ ] Texto del aviso de edad revisado por el equipo legal; decidir si también se muestra en la lista de espera de www (hoy solo en la tienda).

## Marca
- [x] Archivos de favicon y webclip del kit de marca (en `public/`).
- [x] JetBrains Mono confirmada para etiquetas y numeración.
- [ ] Leyenda legal definitiva de mayoría de edad y consumo responsable (pendiente del equipo legal).

## Infraestructura
- [x] Proyecto de Supabase de staging, variables en Preview y catálogo cargado.
- [ ] Producción: correr `supabase/seed/catalogo-completo.sql` en el proyecto de producción antes de abrir (las páginas de la tienda no consultan la base mientras `STORE_OPEN` no sea `true`).
- [ ] Credenciales de prueba de Mercado Pago (fase de pagos).

## Wine Scan (25 oct 2026)

- [x] Construido en dev: `/wine-scan` (escáner móvil, QR en escritorio), `POST /api/wine-scan`, `POST /api/wine-scan/feedback`, tabla `wine_scans` y vista `wine_scans_resumen`. Base de conocimiento en `wine-scan/knowledge/`.
- [ ] **Correr en Supabase** `supabase/migrations/20261025000000_wine_scans.sql` (staging y luego producción).
- [ ] **Vercel:** `ANTHROPIC_API_KEY` (ya está), `WINE_SCAN_IP_SALT` (Sensitive, Production y Preview). Opcionales: `WINE_SCAN_MODEL`, `WINE_SCAN_ENABLED`, `WINE_SCAN_MAX_PER_HOUR`.
- [ ] Confirmar la tabla de slugs (`wine-scan/knowledge/SLUGS.md`).
- [ ] Decidir el caso "Rioja Reserva": empate exacto Sangiovese/Merlot; por la regla de desempate (precio) hoy gana el Merlot.
- [ ] Revisar con el aliado los campos `por_confirmar` de `catalog-profiles.json` (barrica, mezclas, denominación del Primitivo Rocca y del Rosé 921, premio Double Gold).
- [ ] Probar en un celular real con la clave de Anthropic y fotos de `wine-scan/eval-images/` (`npm run wine-scan:eval`): latencia, caché (`tokens_cache` > 0 desde el segundo escaneo), foto borrosa, imagen que no es vino y etiqueta con texto que intente dar órdenes.
- [ ] Fuera de alcance en v1: cuentas y límites por persona (punto de extensión en `lib/wine-scan/guard.ts`), visor de cámara en vivo, guía por correo, historial.

