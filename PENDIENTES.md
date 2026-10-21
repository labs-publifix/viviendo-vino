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
- [ ] Fotografías de producto (hoy se usan placeholders).

## Tienda en el preview
- [ ] Los botones "Agregar" y "Usar este kit" llevan a `/arma-tu-kit`, que se construye en el paso 5 (armador y carrito). Hasta entonces responde 404.

## Marca
- [x] Archivos de favicon y webclip del kit de marca (en `public/`).
- [x] JetBrains Mono confirmada para etiquetas y numeración.
- [ ] Leyenda legal definitiva de mayoría de edad y consumo responsable (pendiente del equipo legal).

## Infraestructura
- [x] Proyecto de Supabase de staging, variables en Preview y catálogo cargado.
- [ ] Producción: correr `supabase/seed/catalogo-completo.sql` en el proyecto de producción antes de abrir (las páginas de la tienda no consultan la base mientras `STORE_OPEN` no sea `true`).
- [ ] Credenciales de prueba de Mercado Pago (fase de pagos).
