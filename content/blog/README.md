# Blog de Viviendo Vino · guía de redacción

Esta guía es para las sesiones de Claude Code que escriben el blog. Cada artículo es un archivo Markdown en esta carpeta (`content/blog/<slug>.md`). No hay base de datos: publicar es crear o editar un archivo y hacer commit.

## El flujo: "¿qué artículo sigue?"

Cuando el equipo pregunte qué artículo sigue:

1. **Lee `BACKLOG.md` completo** (es la fuente de verdad de temas, fechas, SEO y reglas) y toma la ficha con estado `Idea aprobada` y la fecha más próxima. Cámbiala a `Redactando`.
2. **Consulta** el manual de marca y las skills `impeccable` y `ui-ux-pro-max`; respeta la voz de abajo.
3. **Redacta** `content/blog/<slug>.md` con los campos de la ficha (tabla de abajo). La `fecha` es el jueves de la ficha: el artículo se publica solo ese día a las **9:00 am CDMX**.
4. Si es **guía**, crea también su PDF (ver "Guías en PDF").
5. **Control de calidad** (obligatorio, lo haces tú): la lista del backlog §1 y la de abajo. Verifica los datos generales de vino contra una fuente confiable y anótala en la ficha. Corre `npm run lint`, `npm test` y `npm run build`.
6. **Sube a dev**: commit en `feature/store`, avanza `develop` y haz push. En dev los artículos con fecha futura se ven con la etiqueta "Programado". Cambia el estado a `En revisión (dev)` y muéstrale al equipo el enlace del preview y, si es guía, el PDF.
7. **Cuando el equipo diga "llévalo a main"**: fusiona a `main` (solo con esa aprobación expresa). Cambia el estado a `Programado`. El día y la hora de su `fecha` aparece solo en producción, sin desplegar nada más; ese día cambia el estado a `Publicado` y agrega los enlaces recíprocos desde 2 artículos anteriores (columna Relacionados).

Notas:

- Mientras la tienda esté cerrada (`STORE_OPEN` distinto de `true`), el blog no se ve en producción aunque esté en `main`; aparece completo el día que abre la tienda.
- Los artículos con `ejemplo: true` nunca se muestran en producción.
- `publicado: false` es un borrador: no se ve en ningún lado.

Si es una **guía**: además del artículo, crea su PDF con la plantilla de marca (ver "Guías en PDF" abajo) y pon la ruta en el campo `pdf`. Las guías usan siempre `color: "acento"`.

## Guías en PDF

Todas las guías descargables salen de la misma plantilla (`scripts/guias/guia.css`), así que se ven iguales: hoja carta en hueso, logotipo a color arriba a la izquierda (nunca se deforma: solo se fija su ancho), número y fecha en mono, categoría, titular enorme con el número fantasma detrás, bloque oscuro "En pocas palabras", secciones numeradas y el pie con viviendovino.com y la leyenda legal. Las guías hablan como marca: **no llevan nombre de persona**.

1. Copia `guias/_plantilla.md` a `guias/<nombre>.md` y llena los datos: `titulo`, `numero` (la cifra del artículo, con dos dígitos), `categoria`, `entradilla` (una o dos frases), `fecha`, `resumen` (2 o 3 frases cortas) y `ejemplo`.
2. Escribe las secciones en Markdown: cada `##` es una sección numerada (01, 02…). Las secciones van a dos columnas; la que lleva una tabla ocupa todo el ancho. En las tablas, una celda corta que empieza con número ("6 a 8 °C") sale como cifra destacada. Una cita (`>`) fuera de las secciones queda como consejo destacado.
3. Genera el PDF: `npm run guides:build -- <nombre>` (o `npm run guides:build` para todas). Sale en `public/guias/<nombre>.pdf`. Necesita Chrome instalado (o `CHROME_PATH` apuntando a Chromium).
4. La guía es de **una sola página**. Si no cabe, el script se detiene y lo dice: recorta texto o quita una sección, no cambies la plantilla.
5. En el artículo, pon `pdf: "/guias/<nombre>.pdf"`.

Para revisar la imagen de la página sin abrir el PDF: `GUIDE_PREVIEW=<carpeta> npm run guides:build -- <nombre>` guarda una captura en esa carpeta.

## Datos del inicio (front matter)

```yaml
---
titulo: "Título del artículo"           # el H1 de la ficha
titulo_seo: "Título corto | Viviendo Vino"  # title tag de la ficha, máximo 60 caracteres
slug: "titulo-del-articulo"            # igual al nombre del archivo; nunca cambia una vez publicado
extracto: "La meta descripción de la ficha (110 a 155 caracteres)."
tipo: "articulo"                       # articulo | guia
categoria: "Aprende"                   # Aprende | Guías de maridaje | Del catálogo | otra nueva
color: "oscuro"                        # oscuro | claro | vino | acento (acento solo para guías)
cifra: "07"                            # el número de la fila del backlog, con dos dígitos
fecha: "2026-11-05"                    # AAAA-MM-DD; se publica ese día a las 9:00 am CDMX
actualizado: "2026-11-12"              # opcional; solo se muestra si es distinta a la fecha
pdf: "/guias/mi-guia.pdf"              # solo en guías
relacionados:                          # slugs de la columna Relacionados de la ficha
  - "como-leer-la-etiqueta-de-un-vino"
resumen:                               # 3 o 4 frases para "En pocas palabras"; permite **negritas**
  - "Primera idea clave."
  - "Segunda idea clave."
  - "Tercera idea clave."
vinos:                                 # slugs reales del catálogo (data/catalogo-inicial.json)
  - "merlot-veneto-igt-2024"
preguntas:                             # las 3 preguntas de la ficha
  - pregunta: "¿Pregunta?"
    respuesta: "Respuesta corta."
publicado: true                        # false = borrador, no se ve en ningún lado
ejemplo: false                         # true solo en contenido de muestra
---
```

Lo que se calcula solo: el **tiempo de lectura** (200 palabras por minuto), el **índice lateral** (sale de los títulos `##`), los **datos estructurados** (artículo, ruta y preguntas frecuentes), la **imagen para compartir** y el **sitemap**. El orden es del más reciente al más antiguo; en la misma fecha, la cifra más alta va primero.

Los colores alternan: no repitas el mismo color en dos artículos seguidos. `vino` se usa poco (es el acento de la marca).

## Voz de marca

- **Lenguaje natural**, como le explicarías a un amigo. Tuteo, español de México.
- **Sin jerga ni tecnicismos.** Si una palabra técnica es necesaria (IGT, DOC), explícala en la misma frase.
- **Sin clichés de maridaje**: nada de "el compañero perfecto para tu carne roja". Mejor momentos concretos: una cena entre semana, una tarde de calor.
- **Dato antes que adjetivo.** "Sírvelo entre 6 y 8 °C" en lugar de "sírvelo bien frío para una experiencia única".
- **Sin superlativos** ni palabras vacías: evita "exclusivo", "selecto", "premium", "el mejor".
- **Párrafos cortos** (2 a 4 frases) y frases claras.

## Estructura recomendada

1. **Introducción corta** (1 o 2 párrafos, antes del primer `##`): de qué va y por qué te sirve.
2. **"En pocas palabras"**: sale sola del campo `resumen`, justo después de la introducción.
3. **Secciones** con títulos `##`. Cuando sea natural, escribe el título como la pregunta que la gente busca y responde justo debajo en 40 a 60 palabras. Usa listas, tablas sencillas y alguna frase destacada con `>`.
4. **Preguntas frecuentes**: las 3 de la ficha, en el campo `preguntas`.
5. **Enlaces internos**: mínimo 1 a una categoría o vino del catálogo, 2 a otros artículos ya publicados y 1 CTA (kit, quiz o Wine Scan), con texto descriptivo (nunca "haz clic aquí").
6. **Cierre**: la página ya termina con el botón "Armar mi kit". En el texto puedes enlazar al [armador](/arma-tu-kit) o al [quiz](/quiz).

Extensión: la de la ficha (columna "Longitud objetivo").

## Revisión antes de publicar

- [ ] Ortografía y acentos (incluidos los títulos y el resumen).
- [ ] Todos los enlaces funcionan (`/arma-tu-kit`, `/quiz`, `/vinos/...`).
- [ ] Cada slug de `vinos` existe en el catálogo y está disponible.
- [ ] **Nada inventado sobre los vinos del catálogo**: solo nombres del catálogo y datos que estén en su ficha o etiqueta (`supabase/seed/catalogo.sql`, campo `descripcion`). Si falta un dato, se omite.
- [ ] Cero precios escritos a mano; cero promesas de envío, factura o devolución que no estén en `/envios`, `/terminos` o `/preguntas-frecuentes`; cero fechas de entrega.
- [ ] Ningún kit mezcla grupos: en La Selezione se combinan blancos, rosado y tintos; Bollicine es una caja completa de espumosos.
- [ ] No hay anécdotas, viajes ni opiniones atribuidas a Rafa.
- [ ] `npm test` revisa solo el largo del title tag y la meta, la cifra, los enlaces a otros artículos y las preguntas.
- [ ] El color no repite el del artículo anterior; las guías usan `acento`.
- [ ] Se ve bien en dev.viviendovino.com en celular y escritorio.
