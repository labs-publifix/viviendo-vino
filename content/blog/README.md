# Blog de Viviendo Vino · guía de redacción

Esta guía es para las sesiones de Claude Code que escriben el blog. Cada artículo es un archivo Markdown en esta carpeta (`content/blog/<slug>.md`). No hay base de datos: publicar es crear o editar un archivo y hacer commit.

## Cómo crear un artículo nuevo

1. **Toma el siguiente tema** de `BACKLOG.md` (el de número más bajo con estado `idea` o `listo`). Cámbialo a `redactando`.
2. **Crea el archivo** `content/blog/<slug>.md`. El slug va en minúsculas, sin acentos, con guiones: `como-servir-un-espumoso`.
3. **Llena los datos del inicio** (todos los campos, ver la tabla de abajo). Copia la estructura de un artículo existente.
4. **Escribe el texto** con la estructura recomendada y la voz de marca.
5. **Revisa** con la lista de abajo.
6. **Publica**: pon `publicado: true`, cambia el estado en el backlog a `publicado`, haz commit y push a `develop`. Revisa el artículo en dev.viviendovino.com.

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
titulo: "Título del artículo"
slug: "titulo-del-articulo"            # igual al nombre del archivo
extracto: "Una o dos frases para tarjetas, buscadores y redes."
tipo: "articulo"                       # articulo | guia
categoria: "Aprende"                   # Aprende | Guías de maridaje | Del catálogo | otra nueva
color: "oscuro"                        # oscuro | claro | vino | acento (acento solo para guías)
cifra: "07"                            # opcional; si falta, se usa el número consecutivo por fecha
fecha: "2026-11-05"                    # AAAA-MM-DD
actualizado: "2026-11-12"              # opcional; solo se muestra si es distinta a la fecha
pdf: "/guias/mi-guia.pdf"              # solo en guías
resumen:                               # 3 o 4 frases para "En pocas palabras"; permite **negritas**
  - "Primera idea clave."
  - "Segunda idea clave."
  - "Tercera idea clave."
vinos:                                 # slugs reales del catálogo (data/catalogo-inicial.json)
  - "merlot-veneto-igt-2024"
preguntas:                             # opcional
  - pregunta: "¿Pregunta?"
    respuesta: "Respuesta corta."
publicado: false                       # true para mostrarlo
ejemplo: false                         # true solo en contenido de muestra
---
```

Lo que se calcula solo: el **tiempo de lectura** (200 palabras por minuto), el **índice lateral** (sale de los títulos `##`) y la **cifra** si no la pones. Solo aparecen los artículos con `publicado: true`, del más reciente al más antiguo.

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
3. **Secciones** con títulos `##` claros (4 o 5). Usa listas, tablas sencillas y alguna frase destacada con `>`.
4. **Preguntas frecuentes** (opcional) en el campo `preguntas`.
5. **Cierre**: la página ya termina con el botón "Armar mi kit". En el texto puedes enlazar al [armador](/arma-tu-kit) o al [quiz](/quiz).

Extensión: de 600 a 900 palabras.

## Revisión antes de publicar

- [ ] Ortografía y acentos (incluidos los títulos y el resumen).
- [ ] Todos los enlaces funcionan (`/arma-tu-kit`, `/quiz`, `/vinos/...`).
- [ ] Cada slug de `vinos` existe en el catálogo y está disponible.
- [ ] **Nada inventado sobre los vinos del catálogo**: no atribuyas notas de cata, premios ni datos que no estén en la ficha. El texto habla de vino en general; los vinos aparecen solo en el bloque "Vinos de este artículo".
- [ ] No hay datos de Rafa que no estén confirmados.
- [ ] El color no repite el del artículo anterior; las guías usan `acento`.
- [ ] Se ve bien en dev.viviendovino.com en celular y escritorio.
