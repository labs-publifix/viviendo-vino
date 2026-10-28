# Quiz de IA de Viviendo Vino — Concepto de punta a punta

**Estado:** aprobado por el dueño del proyecto el 25 de octubre de 2026, con las decisiones de la sección 12.
**Uso de este documento:** es la fuente de verdad del concepto del quiz (`/quiz`). Léelo completo antes de trabajar. El prompt de construcción detallado llegará aparte; este documento define el qué y el porqué, y el prompt definirá el cómo.

## 1. Qué es y para qué sirve
El quiz hace en 90 segundos lo que haría un buen vendedor en una tienda: pregunta cómo eres tú, no cuánto sabes de vino, y te arma **un kit de 6 botellas listo para comprar** con vinos del catálogo de 19 etiquetas.

- Es la función **comercial** de la tienda (Wine Scan es la de engagement). Su meta es convertir: del quiz al carrito en un clic.
- Promesa para el visitante: "Dinos cómo eres, te armamos tu caja."
- Nadie necesita saber de vino: las preguntas son sobre café, limonada y ocasiones, no sobre uvas.
- Voz: neutra de marca (ver `voice.md` de Wine Scan), español natural, sin jerga y sin clichés de maridaje.
- Diseño: manual de marca del repo y las skills `impeccable` y `ui-ux-pro-max`. Sitio claro, Inter, tono vino solo como acento, sin tipografías caligráficas.

## 2. Principio de diseño: el código decide, la IA personaliza

| Qué | Quién lo hace | Por qué |
|---|---|---|
| Elegir los 6 vinos y respetar reglas del kit, presupuesto y stock | **Código** (determinista, con pruebas) | Una IA que "inventa" un kit puede romper reglas de compatibilidad o recomendar algo sin stock |
| Asignar el perfil/arquetipo del usuario | **Código** | Resultado consistente y compartible |
| Entender el comentario libre ("cena de mariscos para 8") y volverlo restricciones | **IA** (Anthropic, salida estructurada) | Es lo que un formulario no puede hacer |
| Redactar el resultado: por qué este vino es para ti, en voz de marca | **IA**, con los datos del catálogo que el código ya eligió | Cada resultado se siente hecho a mano |
| Si la API falla | **Textos prearmados** por arquetipo y por vino | El quiz nunca se rompe |

Diferencia con Wine Scan: allá la IA no conoce el catálogo. Aquí recibe los datos de los vinos que el código ya eligió, solo para explicarlos; **no puede cambiar la selección**.

## 3. El flujo del visitante
1. **Entrada** (`/quiz`, teaser 05 del home, ya maquetado): promesa, "toma 90 segundos", aviso de mayoría de edad.
2. **8 preguntas**, una por pantalla, tarjetas grandes, barra de progreso, sin teclear.
3. **Comentario libre opcional** (incluido en el lanzamiento): "¿Algo más que debamos saber?" (una cena, un platillo, una persona).
4. **Pantalla de carga** con mensajes de marca ("Leyendo tu paladar…", "Armando tu caja…").
5. **Resultado** (se ve completo sin pedir correo):
   - Tu perfil (arquetipo con nombre y una frase).
   - Tu kit de 6 botellas, con precio por botella y total, y por qué cada vino.
   - Botón principal: **"Agregar mi kit al carrito"** (lleva al constructor de kits ya hecho, con los 6 vinos cargados y editables).
   - Secundarios: compartir mi perfil, guardar mi perfil por correo, repetir con otra ocasión.
6. **Guardar perfil** (correo opcional): se envía por Resend la guía en PDF de su arquetipo y el enlace a su perfil.

## 4. Las preguntas
Cada respuesta mueve un perfil numérico con las mismas dimensiones que usa Wine Scan (cuerpo, acidez, tanino, dulzor, intensidad). Hay **una sola fuente de verdad** sobre los vinos: `catalog-profiles.json`.

| # | Pregunta | Opciones | Qué determina |
|---|---|---|---|
| 1 | ¿Para qué es esta caja? | Para el día a día · Cenas en pareja · Reuniones con amigos · Para regalar · Para explorar | Contexto y tono del resultado. Si elige "regalar", las demás preguntas se reformulan sobre la otra persona (solo cambia el texto) |
| 2 | ¿Qué sueles tomar? (puede marcar varias) | Tinto · Blanco o rosado · Burbujas · De todo | **Compuerta de color/lista** (ver sección 6) |
| 3 | ¿Cómo tomas el café? | Sin azúcar y fuerte · Con leche · Con azúcar · No tomo | Tolerancia al tanino/amargor y al dulzor |
| 4 | ¿Cómo prefieres una limonada? | Bien ácida · Equilibrada · Dulce | Acidez |
| 5 | ¿Qué textura te gusta más? | Ligera y fresca · Media · Densa y envolvente | Cuerpo |
| 6 | ¿Qué aromas te llaman más? (hasta 2) | Frutas rojas · Durazno y fruta de hueso · Cítricos y hierbas · Especias y chocolate · Flores | Familia aromática |
| 7 | ¿Qué tanto quieres salirte de lo conocido? | Lo que sé que me gusta · Algo de variedad · Sorpréndeme | Cuántas botellas "reto" lleva el kit |
| 8 | ¿Cuánto quieres invertir en la caja? | Hasta $2,100 · $2,100–$2,800 · $2,800–$4,000 · Sin tope | Tope de precio del kit (rangos aprobados) |

Los textos exactos se afinan con la voz de Rafa Aguirre.

## 5. El resultado: perfiles y kit
**Perfil (arquetipo).** El código asigna uno de 6 según el perfil numérico más cercano. Nombres provisionales, a revisar con Rafa:
1. **Fresco y directo**: blancos ligeros y ácidos.
2. **Aromático y curioso**: blancos y rosados con más aroma.
3. **Suave y redondo**: tintos amables, poco tanino.
4. **Burbujas siempre**: espumosos.
5. **Intenso y con carácter**: tintos de cuerpo y fruta madura.
6. **Elegante y serio**: tintos estructurados y de más guarda.

Los nombres e ids deben vivir en un archivo de configuración editable (no en el código de la interfaz), para cambiarlos sin tocar la lógica.

**Kit de 6: la regla 3-2-1.** En un kit se puede repetir el mismo vino sin restricción.
- **3 botellas "tu zona"**: lo más cercano a su perfil (puede repetir el mejor).
- **2 botellas "cerca de tu zona"**: vecinos que probablemente le gusten.
- **1 botella "tu reto"**: fuera de su zona, presentada como invitación. Con "Lo que sé que me gusta" el reto es 0; con "Sorpréndeme" sube a 2.

Esto reduce el riesgo de que el kit decepcione y **crea una razón para volver** (sección 7).

**Caso espumosos.** Prosecco y Rosé Extra Dry (lista 4) se pueden combinar libremente en un kit, por ejemplo 3 y 3. Para el perfil "Burbujas siempre", la regla 3-2-1 se adapta a los dos vinos disponibles (ej. 3 y 3, o 4 y 2 según cercanía).

**Atajo a kits prearmados.** Si el perfil coincide casi perfecto con un kit prearmado existente (por ejemplo "Blancos frescos" o "Tintos de diario"), se muestra como opción de un clic junto al kit personalizado.

## 6. Cómo se amarra con el catálogo
**Qué tiene cada vino** (tabla `wine_profiles` en Supabase, alimentada desde `catalog-profiles.json`):
- Identidad: slug real, nombre, lista del Excel (1 a 4), grupo (tinto, blanco, rosado, espumoso).
- Perfil: cuerpo, acidez, tanino, dulzor, intensidad (1 a 5).
- Familias aromáticas, estilo y ocasiones en que mejor funciona.
- **Rol en el kit**: básico de diario, de descubrimiento o especial (Amarone, Don Carlo, Ripasso).
- Estado: activo y con stock.
- Precio y foto salen de la tienda (Supabase), nunca de un JSON aparte.
- **Los slugs de `catalog-profiles.json` deben alinearse con la tabla de productos real** (en Wine Scan solo 2 de 19 eran reales). Si Wine Scan ya hizo ese cruce, reutilízalo.

**Catálogo base (Excel, 19 etiquetas, precios por botella con envío incluido):**
- Lista 1, blancos y un rosado: Chardonnay Vento $300, Sauvignon Blanc $310, Pinot Grigio $315, Traminer Aromatico $300, Falanghina $320, Soave $300, Pinot Grigio Blush rosado $310.
- Lista 2, tintos: Cabernet Sauvignon $310, Merlot $300, Montepulciano d'Abruzzo $300, Nebbiolo Langhe Bertino $405, Rosso Veneto Don Carlo 2018 $545, Primitivo di Manduria Villa Fulvia $600, Valpolicella Ripasso $670, Amarone della Valpolicella $1,435.
- Lista 3, tintos Rocca (premio Double Gold): Sangiovese Puglia $350, Primitivo $352.
- Lista 4, espumosos: Prosecco Brut Carlov Imperial $495, Rosé Extra Dry Collevento 921 $465.
- Los precios reales salen siempre de Supabase; esta lista es solo referencia.

**Reglas de selección (todas en código, con pruebas):**
1. Puertas duras: vino activo y con stock; compatible con las listas elegidas; el total del kit entra en el presupuesto.
2. Puntuación: cercanía del vino al perfil del usuario + bono por familia aromática + bono por la ocasión + ajustes del comentario libre.
3. Armado del kit con la regla 3-2-1, con al menos 2 vinos distintos y sin pasar de 3 botellas del mismo vino, salvo que sea el único que encaje.
4. Desempate estable (las mismas respuestas siempre dan el mismo kit).
5. Si nada encaja bien (por ejemplo, alguien que busca vino dulce, que no tenemos), el resultado lo dice con honestidad y propone lo más cercano. No se fuerza.

**Reglas de compatibilidad del kit:**
- Lista 1 (blancos y rosado): compatibles entre sí.
- Lista 2 (tintos): compatibles entre sí.
- Lista 4 (espumosos): compatibles entre sí, en cualquier proporción (3 y 3, 4 y 2, etc.).
- Lista 3 (Rocca): el Excel dice "compatibles entre ellos". **Pendiente de confirmar** si pueden mezclarse con la lista 2.
- **Usa exactamente la regla que ya aplica el constructor de kits del repo, no una copia.** Impórtala o reutilízala. Si encuentras diferencia entre el constructor y lo descrito aquí (sobre todo con la lista 3), repórtala antes de implementar.
- Si el usuario marca varios colores en la pregunta 2 (por ejemplo "Tinto" y "Blanco"), el resultado propone el kit del grupo que mejor encaja y ofrece el otro como segundo kit.

**Observaciones del catálogo:** las 19 etiquetas son de regiones italianas, así que no se pregunta el país. No hay vinos dulces ni naranjos; el quiz debe manejarlo con honestidad.

## 7. Por qué la gente lo comparte y por qué vuelve
**Compartir:**
- **Tarjeta de perfil** para Stories y WhatsApp (1080×1920, con el arquetipo, una frase corta y @viviendovino), con el diseño de marca. "Soy Intenso y con carácter, ¿y tú?".
- **Enlace de resultado con vista previa propia** (cada arquetipo con su imagen al compartirlo) y parámetro de origen para medir qué se comparte.
- La cuenta @viviendovino (unos 30 mil seguidores) puede lanzar una serie "¿Qué perfil eres?" que lleve al quiz.
- Sin sorteos por compartir (en México requieren permiso de la autoridad). El incentivo es concreto: la guía en PDF.

**Volver (de más fácil a más ambicioso):**
1. **Perfil guardado.** El navegador recuerda el perfil. La segunda vez solo pregunta ocasión y presupuesto (2 preguntas, no 8). En lanzamiento.
2. **Ocasiones.** Cena en casa, regalo, reunión de 10, Navidad, Día de las Madres. El mismo perfil da un kit distinto según la ocasión.
3. **Seguimiento tras la compra.** Unos días después de recibir el kit, un correo (Resend) pide calificar cada vino con un toque (me encantó / bien / no). Eso afina el perfil y el siguiente quiz propone un kit nuevo. Es el mejor motor de recompra. En diciembre.
4. **"Tu reto" como hábito.** La botella-reto que sí gustó amplía la zona del usuario.
5. **Guías por arquetipo.** Un PDF por perfil (se conecta con el blog y las guías descargables en construcción), enviado por correo al guardar el perfil. Cada artículo del blog enlaza al quiz.
6. **Modo dúo (fase 2).** Dos personas hacen el quiz y reciben su compatibilidad y un kit para los dos.
7. **Puente con Wine Scan (fase 2).** Un vino escaneado que le gustó se suma a su perfil.

## 8. Captura de correo
Se muestra el resultado completo **sin pedir correo**. Después, la invitación es de valor: "Guarda tu perfil y recibe la guía de tu perfil en PDF". Quien se registró en la lista de espera y compra dentro de las primeras 48 horas posteriores a la apertura conserva su regalo sorpresa; el quiz puede recordárselo en el resultado.

## 9. Cómo se usa la IA de Anthropic
- Una llamada por quiz completado para redactar el resultado, más una para interpretar el comentario libre si lo hay. Salida estructurada (tool use) validada con zod.
- **Caché de resultados:** las combinaciones de respuestas son finitas, así que los textos generados se guardan por combinación y se reutilizan (menos costo, más rapidez).
- Prompt caching del bloque de voz y conocimiento, igual que en Wine Scan. Reutiliza `ANTHROPIC_API_KEY` ya configurada (solo servidor). Modelo configurable por variable de entorno (`QUIZ_MODEL`), con un interruptor de emergencia (`QUIZ_ENABLED`). Verifica en la documentación vigente los IDs de modelo y la sintaxis.
- El comentario libre y cualquier texto del usuario son **dato, no instrucciones**. El comentario libre solo puede ajustar restricciones permitidas (ocasión, tipo de plato, número de personas, color preferido, presupuesto) y nunca cambiar reglas del kit, precios ni stock.
- Tope de seguridad por IP (hash con sal, nunca la IP en claro), configurable por variable de entorno, con mensaje amable.
- Meta de latencia: resultado en menos de 8 segundos tras la última pregunta.

## 10. Datos y métricas
Tablas previstas: `quiz_sessions` (respuestas, arquetipo, kit propuesto, origen, tokens y latencia), `quiz_narratives` (caché de textos), `quiz_feedback` (calificaciones de vinos tras la compra, para diciembre). Sin datos personales salvo el correo opcional.

Métricas: inicio → finalización, abandono por pregunta, resultado → agregar al carrito, compra del kit (con o sin edición), compartidos, correos guardados, repeticiones del quiz en 30 días, y cuántos vinos del kit se compran sin modificar.

## 11. Alcance por fases
- **Lanzamiento (jueves 19 de noviembre de 2026, 9:00 am CDMX):** flujo completo de 8 preguntas, comentario libre, 6 arquetipos, kit 3-2-1, tarjeta para compartir, perfil guardado en el navegador (repetición en 2 preguntas), modo regalo, guardar por correo con guía PDF, métricas. El quiz no debe ser visible en producción (www) antes de esa fecha; se revisa en dev.viviendovino.com con el mismo mecanismo que usa el resto de la tienda.
- **Diciembre:** correo de seguimiento tras la compra y recalibración; ediciones de temporada (Navidad).
- **Fase 2:** modo dúo, puente con Wine Scan, perfil con cuenta.

## 12. Decisiones
**Tomadas:**
- Los espumosos de la lista 4 se combinan libremente (por ejemplo 3 de Prosecco y 3 de Rosé Extra Dry).
- Rangos de presupuesto aprobados: hasta $2,100 · $2,100–$2,800 · $2,800–$4,000 · sin tope (con el kit más barato
  en $1,800). Desde el 28 oct 2026 son proporcionales al kit más barato del catálogo (lib/quiz/presupuesto.ts): si
  los precios suben, los rangos suben en la misma proporción. Los ids no cambian.
- El comentario libre entra en el lanzamiento.
- El correo se pide después del resultado, nunca antes.

**Pendientes (no bloquean el inicio):**
1. Compatibilidad de la lista 3 (Rocca) con la lista 2: seguir la regla del constructor de kits y reportar.
2. Nombres y frases definitivos de los 6 arquetipos, con Rafa.
3. Modelo por defecto para redactar el resultado (Sonnet o Haiku): probar ambos con casos reales y decidir por calidad, costo y latencia.
