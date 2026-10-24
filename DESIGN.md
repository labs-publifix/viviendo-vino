# DESIGN.md · Viviendo Vino

Sistema de diseño de la tienda, extraído del **Manual de identidad 2026** (la autoridad). Las skills *impeccable* y *ui-ux-pro-max* afinan la ejecución; nunca cambian la identidad. Cada valor dice de dónde sale:

- **[M §n]**: el manual lo define (apartado n).
- **[D]**: decisión tuya en esta conversación.
- **[P]**: el manual no lo define; es mi propuesta y necesita tu visto bueno.
- **[A]**: propuesta aprobada por ti el 21 de octubre de 2026.

Los tokens viven en `app/globals.css` (`:root`) y los consumen los componentes de `app/_ui/`. Ningún componente usa valores sueltos.

---

## 1. Tema

- **Sitio claro sobre hueso**: catálogo, armador, carrito y checkout. **[M §12]**
- **Bloques oscuros puntuales** (negro tinto con atmósfera): la portada de la tienda (hero), la cabecera de categoría y el cierre de página. Nunca un formulario sobre oscuro. **[M §10.01, §6 Atmósfera]**
- El vino pleno como fondo, solo en un momento puntual (pop-up de promoción). **[M §6 Proporciones, §10.04]**
- La tienda **no** cambia a modo oscuro con el sistema; la lista de espera sí lo conserva. **[D]**
- Proporción por pantalla: neutros (negro tinto y hueso) 75–85%, vino + carmín 10–15%, secundarios ≤5%. **[M §6]**

## 2. Color

| Token | Valor | Rol | Fuente |
|---|---|---|---|
| `--vv-negro` | `#0A0206` | Texto sobre claro; fondo de bloques oscuros | [M §6, §12] |
| `--vv-hueso` | `#F3ECE4` | Fondo del sitio; texto sobre oscuro | [M §6, §12] |
| `--vv-vino` | `#9A2030` | Acento: línea, etiquetas numeradas sobre claro, botón principal sobre claro | [M §6, §12] |
| `--vv-carmin` | `#CF2C4B` | Botón principal sobre oscuro, foco, palabra destacada en bloques oscuros | [M §6, §12] |
| `--vv-ciruela` | `#641F53` | Barras de dato y eco de la atmósfera | [M §6] |
| `--vv-orquidea` | `#D2A5C8` | Cifras y tags **sobre oscuro**, ≤5% | [M §6] |
| `--vv-ambar` | `#D98A4B` | Acento cálido pequeño (aún "por medir") | [M §6] |
| `--muted` | `#5C5454` | Texto secundario sobre hueso (6.3:1) | [A] |
| `--line` | `rgb(10 2 6 / .14)` | Líneas de 1 px sobre claro | [A, derivado de M §12 `--vv-line`] |
| `--line-dark` | `rgb(243 236 228 / .16)` | Líneas de 1 px sobre oscuro | [M §12] |
| `--surface` | `#FAF6F1` | Superficie de tarjetas y campos sobre hueso | [A] |
| `--ok` / `--error` / `--aviso` | `#2B7A50` / `#C33A2C` / `#B97A12` | Estados: siempre como punto o texto pequeño, **nunca como fondo** | [M §6 Funcionales] |

**Combinaciones (contraste verificado):** negro sobre hueso 17.5:1 · hueso sobre negro 17.5:1 · hueso sobre vino 6.8:1 · vino sobre hueso 6.8:1 · blanco sobre carmín 5.1:1 · carmín sobre negro 4.0:1 (solo texto grande o botón).
**Prohibidas** [M §6]: vino sobre negro, carmín sobre vino, orquídea sobre hueso, tres acentos juntos.

- **[A] Botón principal:** el manual pide el carmín en el botón, pero carmín sobre hueso da 4.4:1 y no pasa AA en texto chico. Propongo **vino con texto hueso sobre claro (6.8:1)** y **carmín con texto blanco sobre oscuro (5.1:1)**.
- **[A] Etiquetas numeradas** ("01 — LA UVA"): el manual las pinta en carmín, que sobre hueso no pasa AA a 12 px. Propongo **vino sobre claro y carmín sobre oscuro**.
- **Grupos de botella** (azul, rojo, verde, amarillo): **solo por nombre, sin color**. **[D]** Los colores funcionales del manual no se usan.

## 3. Tipografía

| Rol | Fuente | Peso / tracking | Escritorio | Móvil | Fuente |
|---|---|---|---|---|---|
| Hero (1–4 palabras) | Inter | Black 900, −4% | 96–120 | 48–56 | [M §5] |
| Sección | Inter | ExtraBold 800, −2% | 56 | 36 | [M §5] |
| Subtítulo | Inter | Medium 500 | 28 | 22 | [M §5] |
| Texto | Inter | Regular 400, interlineado 1.5 | 16–18 | 16 | [M §5] |
| Etiqueta y numeración | JetBrains Mono | 500, mayúsculas, +10% | 12 | 11 (mínimo) | [M §5] [D] |
| Cifra (precio) | Inter | ExtraBold 800, cifras tabulares; unidad pequeña en vino | — | — | [M §7 elemento 06] |

- Titular en frase corta, con punto final si afirma. Un solo énfasis por pieza. Sin serifas, sin sombras en el texto, sin caligrafía fuera del logotipo. **[M §5]**
- Correos: titulares en Arial/Helvetica Bold. **[M §5]**

## 4. Espacio, radios, sombras y movimiento

Botones deshabilitados en gris neutro, sin vino: el color de marca queda para lo que se puede hacer. **[A]**

- **[A] Espaciado:** escala de 4 px (4, 8, 12, 16, 24, 32, 48, 64, 96, 128). Márgenes generosos, alineación a la izquierda y un punto focal por pantalla. **[M §7]**
- **Contenedor:** 1200 px de ancho máximo; margen lateral de 16 px en móvil y 32 px en escritorio. **[A]**
- **Radios:**
  - Botones, chips y campos: píldora (999 px). **[M §12]**
  - Tarjetas y paneles: **[A] 16 px**.
  - Imagen de botella: sin radio. **[A]**
- **Líneas de 1 px a baja opacidad: el único adorno.** **[M §7]**
- **Sombras:** **[A]** sin sombras en tarjetas; solo una sombra suave en lo que flota (barra fija del kit en móvil y avisos).
- **Movimiento:** fundido con desplazamiento corto, 200–400 ms (`--vv-dur` 240 ms), sin rebotes. Barras que se llenan y números que cuentan. Todo se desactiva con `prefers-reduced-motion`. **[M §7, §12]**
- **Foco:** 2 px sólido en carmín, separado 2 px. **[M §12]**

## 5. Íconos e imágenes

- Trazo fino y uniforme (1.5 px), formas simples y esquinas redondeadas: copa, caja, envío, WhatsApp. Sin uvas, barricas ni corchos. SVG propios. **[M §7]**
- Fotografía: luz lateral baja y fondo mate oscuro. **Se usarán fotos reales de cada vino.** Mientras no estén, cada vino usa un placeholder de botella dibujado con línea fina sobre la superficie clara. La imagen es un campo del producto: al subir la foto, el placeholder desaparece solo. **[M §8] [A]**

## 6. Componentes y estados

Todos en `app/_ui/` y todos con estados de foco visible, hover y `disabled`.

| Componente | Elemento del manual | Variantes | Estados |
|---|---|---|---|
| **Botón píldora** | §7.07, §12 | relleno, contorno, enlace · sobre claro / sobre oscuro | normal, hover, foco, presionado, deshabilitado, cargando |
| **Campo** (texto, select, casilla) | — [A] | con etiqueta visible, ayuda y error | vacío, foco, lleno, error junto al campo, deshabilitado |
| **Chip** (filtros) | §7.09 | píldora de contorno; activo relleno en negro tinto | normal, hover, activo, deshabilitado |
| **Etiqueta mono numerada** | §7.02 | "01 — LA UVA" | — |
| **Cifra con unidad** (precio) | §7.06 | botella, kit, total | — |
| **Tarjeta de vino** | §12 | catálogo, armador | normal, hover, en tu kit (con cantidad), **no cabe en este kit** (atenuada con aviso) [D], agotado, cargando (esqueleto) |
| **Control de cantidad** | — [A] | − n + | mínimo, máximo (kit lleno), deshabilitado |
| **Progreso del kit** | §7.03, §10.02, §12 | panel lateral en escritorio, barra fija inferior en móvil | vacío, en progreso ("3 de 6 · te faltan 3"), completo, error de compatibilidad, cargando |
| **Tarjeta de kit** | §12 | kit prearmado, renglón del carrito | normal, hover, editar o quitar |
| **Barra de dato** | §7.05 | perfil (cuerpo, acidez…) | — (sin datos del aliado por ahora) |
| **Encabezado** | §10.01 | logo + navegación + "Arma tu kit" + carrito | menú móvil abierto y cerrado; contador del carrito |
| **Pie** | §10.11 | enlaces, +18, consumo responsable | — |
| **Avisos** | §12 "Mensajes del sitio" | info, éxito, aviso, error (punto de color + texto) | — |
| **Barra de anuncios** | §10.04 | marquesina en bucle con punto carmín entre mensajes | se pausa al pasar el cursor, al enfocarla o con su botón; fija con movimiento reducido; se puede cerrar |
| **Redes (portada)** | — | filas editoriales en el bloque de cierre: número, ícono, nombre en Inter 900 mayúsculas, usuario y flecha carmín; Instagram primero | al pasar el cursor o enfocar: línea carmín a la izquierda y nombre en carmín; abren en otra pestaña |
| **Aviso de edad** | §10.05 | pantalla completa en negro tinto con atmósfera, logo para fondo oscuro, "¿Tienes 18 años o más?" | sí (se recuerda 30 días), no ("Vuelve cuando cumplas 18"), foco atrapado en el aviso |
| **Bloque oscuro** | §6 Atmósfera | opcional: imagen limpia con corte recto (hero de la portada: panel derecho en escritorio, debajo del texto en tableta y móvil) o foto de fondo tenue; negro tinto `#0A0206` con resplandor vino (esquina superior derecha) y eco ciruela (inferior izquierda), calibrados contra el slide 06 "Nunca negro plano"; el centro queda en negro tinto | — |

## 7. Voz en pantalla

Tuteo, frases cortas y dato antes que adjetivo. Los botones dicen su acción: "Agregar a mi kit", "Agregar kit al carrito", "Te falta 1". Los errores dicen qué pasó y qué hacer. **[M §9]**

## 8. Choques entre fuentes y cómo se resolvieron

| Tema | Manual | Skill o prompt | Resolución |
|---|---|---|---|
| Etiquetas sobre titulares y numeración "01 —" | Las exige (§7.02) | impeccable las prohíbe | **Gana el manual** |
| Paleta y tipografías | Negro tinto, hueso, vino; Inter + JetBrains Mono | ui-ux-pro-max propone verde/naranja y Rubik + Nunito Sans | **Gana el manual** |
| Inter como display | La pide (§5) | impeccable la lista como default de IA | **Gana el manual** |
| Botón principal y etiquetas en carmín | Carmín | Contraste AA (manual §12 y skills) | **[A]** vino sobre claro, carmín sobre oscuro |
| Muro de edad al entrar | Lo propone (§10.05) | Tu prompt original: "sin muros" | **[D]** (22 oct, cambió) aviso de edad al entrar a la tienda, recordado 30 días; la verificación con fecha de nacimiento sigue en el checkout |
| Colores de grupos | Propuesta sin cerrar (§6) | — | **[D]** solo nombre, sin color. Desde el 22 oct, nombres editoriales: La Selezione (azul), I Grandi Rossi (rojo), Selezione d’Oro (verde) y Bollicine (amarillo); los colores quedan solo como códigos internos |
