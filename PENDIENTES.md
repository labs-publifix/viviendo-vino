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
- [ ] Cifra de seguidores de Instagram en la portada ("+30 mil seguidores", oct 2026): actualizarla de vez en cuando en `lib/social.ts`.
- [ ] Refresco inmediato del catálogo: hoy un cambio hecho por SQL (precio, foto, stock) tarda en verse y la primera visita a cada página puede mostrar la versión anterior (al navegar del catálogo a una ficha se ve la ficha vieja hasta recargar). Es el caché de la tienda (`cacheLife("minutes")`), no un error de datos. Solución: el panel de administración invalida el caché al guardar (`revalidateTag("catalogo", { expire: 0 })`); antes, opcional, un webhook de Supabase que haga lo mismo.
- [ ] Al conectar pagos: el pedido debe leer precios sin caché (hoy la validación usa el catálogo cacheado ~1 minuto).

## Grupos
- [ ] Correr `supabase/seed/grupos-editoriales.sql` en **producción** antes de abrir (en staging ya se corre en esta ronda). Si se corre `catalogo-completo.sql` completo, ya incluye los nombres nuevos.

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
