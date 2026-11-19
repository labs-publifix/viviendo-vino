"""Documento de cierre de proyecto (Fase 1) para Rafael Aguirre. Genera docs/cierre/cierre-proyecto.html; el PDF se
imprime con Playwright. Informativo: sin montos ni firmas. Las capturas usan datos de ejemplo.

    python3 docs/cierre/generar-cierre.py
"""
from pathlib import Path

AQUI = Path(__file__).parent
PAGINAS: list[str] = []
INDICE: list[tuple[str, str, str, int]] = []


def pagina(html: str, pie: str, clase: str = "") -> int:
    PAGINAS.append((html, pie, clase))
    return len(PAGINAS)


def capitulo(n: str, titulo: str, texto: str, resumen: str) -> None:
    p = pagina(
        f'<div class="num">{n}</div><h2>{titulo}</h2><p class="lede">{texto}</p>',
        titulo.rstrip("."),
        "capitulo",
    )
    INDICE.append((n, titulo, resumen, p))


def img(ruta: str, pie: str) -> str:
    return f'<figure class="shot"><img src="{ruta}" alt=""><figcaption>{pie}</figcaption></figure>'


T = "capturas/"   # tienda (copia local, datos de ejemplo)
A = "../aliado/capturas/"   # panel (rol aliado, datos de ejemplo)

# ---------------------------------------------------------------- Portada
pagina("""
<img class="logo" src="../../public/brand/logo-fondo-oscuro.svg" alt="Viviendo Vino">
<div class="centro">
  <p class="eti">Cierre de proyecto · Fase 1</p>
  <h1>La tienda en línea<br>de <em>Viviendo Vino.</em></h1>
  <p class="bajada">Todo lo que se diseñó, construyó y puso en marcha para el lanzamiento de www.viviendovino.com: el sitio, la experiencia de compra, el panel de administración y la plataforma técnica que los sostiene.</p>
  <div class="datos">
    <div><span>Preparado por</span><span>LABS by Publifix</span></div>
    <div><span>Para</span><span>Rafael Aguirre</span></div>
    <div><span>Periodo</span><span>21 oct – 19 nov 2026</span></div>
  </div>
</div>
<div class="meta"><span>Documento informativo</span><span>Apertura: jueves 19 de noviembre de 2026</span></div>
""", "", "oscura")

# ---------------------------------------------------------------- Índice (se llena al final)
INDICE_POS = pagina("", "Contenido")

# ---------------------------------------------------------------- 01 Resumen
capitulo("01", "Resumen del proyecto.", "En cuatro semanas, Viviendo Vino pasó de una lista de espera a una tienda en línea completa: con catálogo, compra y pago, operación con el importador aliado, herramientas con inteligencia artificial y medición.", "Qué se construyó, cifras y estado al abrir")

pagina("""
<p class="eti">01 · Resumen ejecutivo</p>
<h2>Una tienda propia, lista para vender.</h2>
<p class="lede">La Fase 1 entrega una tienda de vino italiano en kits de 6 botellas con el envío incluido, operada en conjunto con un importador aliado. El cliente compra y paga en el sitio; el aliado prepara y envía; Viviendo Vino atiende, cobra y liquida, todo desde un mismo panel.</p>
<div class="stats">
  <div class="stat"><b>19</b><span>vinos en el catálogo, en 4 grupos de botella</span></div>
  <div class="stat"><b>3</b><span>kits prearmados, más el armador libre de 6 botellas</span></div>
  <div class="stat"><b>9</b><span>secciones del panel de administración</span></div>
  <div class="stat"><b>3</b><span>roles con permisos: administrador, atención y aliado</span></div>
  <div class="stat"><b>15</b><span>correos automáticos distintos (pedido, lista de espera, avisos)</span></div>
  <div class="stat"><b>42</b><span>páginas públicas en el mapa del sitio para Google</span></div>
  <div class="stat"><b>180</b><span>pruebas automáticas que revisan las reglas del negocio</span></div>
  <div class="stat"><b>95</b><span>de rendimiento en móvil (PageSpeed) y 100 en SEO, accesibilidad y buenas prácticas</span></div>
</div>
<h3>Estado al lanzamiento (jueves 19 de noviembre)</h3>
<div class="g2">
<ul class="check">
  <li>Tienda publicada en <span class="ruta">www.viviendovino.com</span>, abierta en silencio desde el 17 de noviembre.</li>
  <li>Mercado Pago en modo producción, probado con una compra real de punta a punta.</li>
  <li>Inventario final del aliado cargado (lista del 17 de noviembre).</li>
  <li>Precios, códigos de descuento y la promoción de apertura configurados.</li>
  <li>Aliado invitado al panel, con su manual de operación.</li>
</ul>
<ul class="check">
  <li>Correos de pedido, de equipo y de la lista de espera funcionando.</li>
  <li>Google Search Console verificado, sitemap enviado y páginas principales en indexación.</li>
  <li>Google Analytics 4 midiendo, vinculado con Search Console.</li>
  <li>Aviso de privacidad, términos y envíos publicados y enlazados en el checkout.</li>
  <li>Accesos y variables de todos los servicios entregados a Rafael Aguirre.</li>
</ul>
</div>
""", "Resumen ejecutivo")

pagina("""
<p class="eti">01 · Cronología</p>
<h2>Del registro a la apertura.</h2>
<p class="lede">Los hitos principales del periodo, según el historial del proyecto.</p>
<div class="linea">
  <div class="hito"><span class="fecha">21 – 22 oct</span><p><strong>Lista de espera.</strong> Página de registro con cuenta regresiva, protección contra robots, correo de confirmación con la Guía de maridaje y secuencia de correos rumbo a la apertura.</p></div>
  <div class="hito"><span class="fecha">23 – 26 oct</span><p><strong>Catálogo y contenido.</strong> Base de datos de vinos, grupos y kits; blog con guías descargables; Wine Scan y Quiz IA.</p></div>
  <div class="hito"><span class="fecha">27 – 31 oct</span><p><strong>Panel de administración.</strong> Acceso seguro, equipo y roles, aliados, marquesina, catálogo editable, precio "antes" y el primer módulo de pedidos.</p></div>
  <div class="hito"><span class="fecha">1 – 7 nov</span><p><strong>Operación y cobro.</strong> Correos de pedido, inicio del panel, modelo de liquidación con el aliado, inventario con apartados, códigos de descuento e integración con Mercado Pago.</p></div>
  <div class="hito"><span class="fecha">8 – 16 nov</span><p><strong>Marca e institucional.</strong> Wine Scan como página propia, Nosotros, pie y contacto, cuatro páginas de servicios, documentos legales y ajustes a la lista de espera. El registro cerró el lunes 16.</p></div>
  <div class="hito"><span class="fecha">17 nov</span><p><strong>Apertura en silencio.</strong> Credenciales de producción, compra real de prueba, carga de precios, códigos e inventario; descorchador de regalo para la lista de espera, GA4 y textos legales en el checkout.</p></div>
  <div class="hito"><span class="fecha">18 nov</span><p><strong>SEO, medición y aliado.</strong> Metadatos e imágenes para compartir, datos estructurados, Search Console, GA4, mejoras de velocidad, página de promociones y manual del aliado.</p></div>
  <div class="hito final"><span class="fecha">19 nov</span><p><strong>Apertura oficial</strong> a las 9:00 am (hora del centro de México).</p></div>
</div>
""", "Cronología")

# ---------------------------------------------------------------- 02 La tienda
capitulo("02", "La tienda.", "Lo que ve y usa el cliente: del primer vistazo a la caja en su puerta. Diseñada primero para el celular, con el tema claro de la marca y el vino como color de acento.", "Mapa del sitio, catálogo, compra, herramientas y contenido")

pagina("""
<p class="eti">02 · Mapa del sitio</p>
<h2>Todas las secciones públicas.</h2>
<p class="lede">Cada página tiene su título y descripción para Google, su imagen para compartir y su lugar en el menú, el pie o el menú "Descubrir".</p>
<table>
<thead><tr><th style="width:24%">Sección</th><th style="width:26%">Dirección</th><th>Para qué sirve</th></tr></thead>
<tbody>
<tr><td><strong>Portada</strong></td><td class="small"><span class="ruta">/</span></td><td>Presenta la propuesta (arma tu kit, envío incluido), los grupos, los kits, Descubrir y las redes.</td></tr>
<tr><td><strong>Vinos</strong></td><td class="small"><span class="ruta">/vinos</span></td><td>Catálogo por categoría: blancos y rosado, tintos y espumosos.</td></tr>
<tr><td><strong>Ficha de vino</strong></td><td class="small"><span class="ruta">/vinos/&lt;vino&gt;</span></td><td>Foto, datos (uva, región, denominación, añada), descripción, precio y los kits donde aparece.</td></tr>
<tr><td><strong>Arma tu kit</strong></td><td class="small"><span class="ruta">/arma-tu-kit</span></td><td>Armador de 6 botellas por grupo, con kits prearmados como punto de partida.</td></tr>
<tr><td><strong>Carrito y checkout</strong></td><td class="small"><span class="ruta">/carrito</span> · <span class="ruta">/checkout</span></td><td>Uno o varios kits, datos de envío, edad, factura, código de descuento y pago.</td></tr>
<tr><td><strong>Wine Scan</strong></td><td class="small"><span class="ruta">/wine-scan</span></td><td>Foto de la etiqueta → guía del vino con inteligencia artificial.</td></tr>
<tr><td><strong>Quiz IA</strong></td><td class="small"><span class="ruta">/quiz</span></td><td>Ocho preguntas → perfil de vino y una caja de 6 lista para el carrito.</td></tr>
<tr><td><strong>Blog y guías</strong></td><td class="small"><span class="ruta">/blog</span></td><td>Seis artículos de Rafa Aguirre y guías en PDF descargables.</td></tr>
<tr><td><strong>Nosotros</strong></td><td class="small"><span class="ruta">/nosotros</span></td><td>La historia de la marca y de quien elige cada vino.</td></tr>
<tr><td><strong>Servicios</strong></td><td class="small"><span class="ruta">/servicios</span> + 4 páginas</td><td>Marketing, experiencias con IA, consultoría para centros de consumo y regalos corporativos.</td></tr>
<tr><td><strong>Contacto</strong></td><td class="small"><span class="ruta">/contacto</span></td><td>Formulario con motivos, teléfono, WhatsApp, correo, domicilio y horario.</td></tr>
<tr><td><strong>Ayuda y legales</strong></td><td class="small"><span class="ruta">/preguntas-frecuentes</span> <span class="ruta">/envios</span> <span class="ruta">/terminos</span> <span class="ruta">/privacidad</span></td><td>Preguntas frecuentes, información de envíos, términos y condiciones y aviso de privacidad.</td></tr>
<tr><td><strong>Promociones</strong></td><td class="small"><span class="ruta">/promo/&lt;código&gt;</span></td><td>Enlace para compartir un código: lo aplica solo y tiene su imagen propia.</td></tr>
<tr><td><strong>Lista de espera</strong></td><td class="small">(antes de abrir)</td><td>Registro con cuenta regresiva; se puede volver a usar para futuros lanzamientos.</td></tr>
</tbody></table>
""", "Mapa del sitio")

pagina(f"""
<p class="eti">02 · Portada y catálogo</p>
<h2>La propuesta en un vistazo.</h2>
<p class="lede">La portada presenta la idea central —seis botellas elegidas por ti, con el envío incluido— y lleva directo a armar el kit o ver los vinos. El catálogo ordena los 19 vinos por categoría.</p>
{img(T + "inicio.jpg", "Portada (escritorio).")}
<div class="g2">
  <div class="card"><span class="tag">Portada</span><ul>
    <li>Marquesina superior programable desde el panel, con el precio "desde" calculado solo.</li>
    <li>Cómo funciona, los grupos de botellas, los kits prearmados, Descubrir (Wine Scan, Quiz, blog) y las redes con el feed de Instagram.</li>
  </ul></div>
  <div class="card"><span class="tag">Catálogo</span><ul>
    <li>Filtros por categoría y fichas con disponibilidad en tiempo real (agotado cuando el inventario llega a 0).</li>
    <li>Precio "antes" tachado opcional por vino, con el porcentaje calculado.</li>
  </ul></div>
</div>
""", "Portada y catálogo")

pagina(f"""
<p class="eti">02 · Ficha y armador</p>
<h2>Elegir el vino y llenar los 6 lugares.</h2>
<div class="duo">{img(T + "ficha.jpg", "Ficha de un vino.")}{img(T + "arma-tu-kit.jpg", "Arma tu kit.")}</div>
<h3>La regla del kit</h3>
<p>Cada kit lleva <strong>6 botellas de un mismo grupo</strong> (La Selezione, I Grandi Rossi, Selezione d'Oro y Bollicine); dentro del grupo se mezclan como el cliente quiera y se pueden repetir. La primera botella define el grupo del kit. El carrito acepta varios kits y el precio de cada uno ya incluye el envío a todo México.</p>
<div class="g3">
  <div class="card"><span class="tag">Ficha</span><p>Datos del vino, descripción con la voz de la marca, precio por botella, "va con los vinos de su grupo" y los kits prearmados donde aparece.</p></div>
  <div class="card"><span class="tag">Armador</span><p>Barra de progreso de 0 a 6, filtros por grupo, kits prearmados como punto de partida (Blancos frescos, Tintos de diario y Burbujas) y aviso de existencias.</p></div>
  <div class="card"><span class="tag">Carrito</span><p>Se guarda en el navegador. Cada kit se puede editar, duplicar o quitar; el total se recalcula siempre en el servidor.</p></div>
</div>
""", "Ficha y armador")

pagina("""
<p class="eti">02 · Checkout y pago</p>
<h2>Un checkout corto, claro y seguro.</h2>
<p class="lede">Una sola página con los datos de envío, la confirmación de edad y el pago con tarjeta dentro del sitio, a través de Mercado Pago.</p>
<div class="g2">
  <div class="card"><span class="tag">Datos y legales</span><ul>
    <li>Envío con selector de estado de la marca y validación de código postal y teléfono.</li>
    <li>Fecha de nacimiento: solo mayores de 18 años.</li>
    <li>Una casilla obligatoria para mayoría de edad, Términos y Aviso de Privacidad, más el aviso de privacidad simplificado.</li>
    <li>Casilla de promociones sin marcar, como pide la ley, y "Requiero factura" con instrucciones.</li>
  </ul></div>
  <div class="card"><span class="tag">Inventario apartado</span><ul>
    <li>Al continuar al pago, las botellas se apartan <strong>30 minutos</strong> con un reloj visible; si el tiempo se acaba, el carrito se conserva y se vuelve a revisar el inventario.</li>
    <li>Nadie puede comprar una botella que ya no existe.</li>
  </ul></div>
  <div class="card"><span class="tag">Pago</span><ul>
    <li>Formulario seguro de Mercado Pago dentro del sitio: tarjeta de crédito o débito (incluida Amex), pago de contado.</li>
    <li>Verificación del banco (3D Secure) cuando la pide; los datos de la tarjeta nunca pasan por el sitio.</li>
    <li>En el estado de cuenta aparece como <strong>VIVIENDOVINO</strong>.</li>
  </ul></div>
  <div class="card"><span class="tag">Códigos de descuento</span><ul>
    <li>Por porcentaje o monto, con vigencia, cupo, uso por persona, mínimo de kits y primera compra.</li>
    <li>Se aplican escribiéndolos en el checkout o con un enlace de campaña; un código por pedido.</li>
    <li>El descuento sale del margen de Viviendo Vino: el aliado siempre recibe íntegro su precio.</li>
  </ul></div>
</div>
<div class="nota"><p><strong>Precios a prueba de manipulación.</strong> El navegador solo manda qué vinos y cuántos; el servidor recalcula cada precio, descuento y total con la base de datos antes de cobrar.</p></div>
""", "Checkout y pago")

pagina("""
<p class="eti">02 · Experiencia de compra</p>
<h2>De la compra a la caja en su puerta.</h2>
<div class="flujo">
  <div><b>Arma su kit</b>6 botellas de un grupo, una o varias cajas.</div>
  <div><b>Paga</b>Mercado Pago aprueba; las botellas se descuentan del inventario.</div>
  <div><b>Confirmación</b>El cliente recibe su correo; el equipo y el aliado, el aviso de pedido nuevo.</div>
  <div><b>Preparación</b>El aliado arma la caja (1 a 2 días hábiles) desde su panel.</div>
  <div><b>Envío</b>Captura paquetería y guía; el cliente recibe su número de rastreo.</div>
  <div><b>Entrega</b>Hasta 7 días hábiles; el cliente recibe el correo de entrega.</div>
  <div><b>Liquidación</b>Lo entregado entra al saldo del aliado; las transferencias se registran.</div>
  <div><b>Atención</b>Dudas, daños y devoluciones con Viviendo Vino como único contacto.</div>
</div>
<h3>Correos automáticos</h3>
<table>
<thead><tr><th style="width:30%">Correo</th><th style="width:20%">Para</th><th>Cuándo sale</th></tr></thead>
<tbody>
<tr><td>Recibimos tu pedido</td><td>Cliente</td><td>Al aprobarse el pago; incluye el detalle, la dirección, el plazo y, si aplica, el descorchador de regalo.</td></tr>
<tr><td>Nuevo pedido por preparar</td><td>Equipo y aliado</td><td>Al aprobarse el pago, sin el correo del cliente.</td></tr>
<tr><td>Va en camino · Entregado</td><td>Cliente</td><td>Al marcar el pedido como enviado (con su guía) y como entregado.</td></tr>
<tr><td>Pago no aprobado</td><td>Cliente</td><td>Si el banco rechaza el cobro.</td></tr>
<tr><td>Pocas existencias · Vino agotado</td><td>Equipo y aliado</td><td>Cuando un vino baja a 3 botellas o llega a 0.</td></tr>
<tr><td>Perfil del quiz · Guía del blog</td><td>Cliente</td><td>Cuando guarda su resultado del quiz o pide una guía en PDF.</td></tr>
<tr><td>Contacto (aviso y confirmación)</td><td>Equipo y cliente</td><td>Al enviar el formulario de contacto o de un servicio.</td></tr>
<tr><td>Lista de espera (bienvenida + 5)</td><td>Registrados</td><td>Confirmación con la guía de maridaje y cinco recordatorios en torno a la apertura y el regalo.</td></tr>
</tbody></table>
<p class="small muted">Cada correo enviado (o fallido) queda registrado en el panel y se puede reenviar desde el historial del pedido.</p>
""", "Experiencia de compra")

pagina(f"""
<p class="eti">02 · Descubrir</p>
<h2>Herramientas para elegir mejor.</h2>
<div class="duo">{img(T + "wine-scan.jpg", "Wine Scan.")}{img(T + "quiz.jpg", "Quiz IA.")}</div>
<div class="g2">
  <div class="card"><span class="tag">Wine Scan</span><ul>
    <li>Foto de la etiqueta de cualquier vino → guía con qué es, cómo se siente, cómo servirlo y con qué combina, generada con inteligencia artificial (Anthropic).</li>
    <li>Gratis y sin registro; la foto no se guarda. En computadora muestra un código QR para abrirlo en el celular.</li>
    <li>Cuando hay un vino parecido en la tienda, lo sugiere al final.</li>
    <li>Límite de uso por hora para evitar abusos, con la dirección IP cifrada.</li>
  </ul></div>
  <div class="card"><span class="tag">Quiz IA</span><ul>
    <li>Ocho preguntas sobre gustos cotidianos (unos 90 segundos) → uno de seis perfiles: Fresco y directo, Aromático y curioso, Suave y redondo, Burbujas siempre, Intenso y con carácter, Elegante y serio.</li>
    <li>Arma una caja de 6 vinos lista para el carrito, con el porqué de cada botella.</li>
    <li>Resultado para compartir (tarjeta para historias y vista previa), guardado por correo y guía en PDF por perfil.</li>
  </ul></div>
</div>
""", "Descubrir")

pagina(f"""
<p class="eti">02 · Contenido y servicios</p>
<h2>Blog, guías y servicios para el mundo del vino.</h2>
<div class="duo">{img(T + "blog.jpg", "Blog y guías.")}{img(T + "servicio.jpg", "Una de las cuatro páginas de servicios.")}</div>
<div class="g2">
  <div class="card"><span class="tag">Blog y guías</span><ul>
    <li>Seis artículos escritos para Rafa Aguirre, con índice, resumen, vinos relacionados y preguntas frecuentes.</li>
    <li>Guías en PDF (maridaje y temperatura de servicio) que se descargan dejando el correo, con consentimiento.</li>
    <li>Artículos en archivos de texto, con fecha de publicación programable; imagen para compartir automática por artículo.</li>
  </ul></div>
  <div class="card"><span class="tag">Servicios</span><ul>
    <li>Página general y cuatro páginas: marketing para negocios de vino, experiencias con IA, consultoría para centros de consumo y regalos corporativos.</li>
    <li>Cada una con su foto, secciones, WhatsApp con mensaje propio y formulario que llega a hola@viviendovino.com.</li>
  </ul></div>
</div>
""", "Contenido y servicios")

pagina(f"""
<p class="eti">02 · Confianza y campañas</p>
<h2>Lo que da confianza y lo que impulsa ventas.</h2>
<div class="duo">{img(T + "edad.jpg", "Aviso de edad (se recuerda 30 días).")}{img(T + "promo.jpg", "Página de una promoción.")}</div>
<div class="g3">
  <div class="card"><span class="tag">Mayoría de edad</span><p>Aviso al entrar a la tienda, que se recuerda 30 días, y fecha de nacimiento en el checkout. Google lo permite porque lo exige la ley.</p></div>
  <div class="card"><span class="tag">Legales y ayuda</span><p>Términos, aviso de privacidad (con derechos ARCO y Google Analytics), información de envíos y preguntas frecuentes, con navegación entre ellas.</p></div>
  <div class="card"><span class="tag">Contacto</span><p>Teléfono y WhatsApp (229 132 5000), hola@viviendovino.com, domicilio y horario en el pie y en /contacto; formulario con protección contra spam.</p></div>
  <div class="card"><span class="tag">Promociones</span><p>Enlace <span class="ruta">/promo/CÓDIGO</span> con imagen propia, condiciones y el código aplicado solo; se apaga solo al vencer.</p></div>
  <div class="card"><span class="tag">Lista de espera</span><p>Registro con cuenta regresiva, secuencia de correos y baja con un clic; el descorchador de regalo se marca solo en los pedidos que califican.</p></div>
  <div class="card"><span class="tag">En el celular</span><p>Todo el sitio está pensado primero para el celular: menú lateral, botones grandes y formularios cómodos.</p></div>
</div>
""", "Confianza y campañas")

# ---------------------------------------------------------------- 03 El panel
capitulo("03", "El panel de administración.", "Donde se opera la tienda día a día: pedidos, inventario, catálogo, finanzas, promociones, contenido y equipo, en www.viviendovino.com/admin.", "Módulos, operación diaria, roles y permisos")

pagina(f"""
<p class="eti">03 · Módulos</p>
<h2>Un solo panel para todo el equipo.</h2>
<div class="lado">
{img(A + "inicio.png", "Inicio del panel (vista del aliado, datos de ejemplo).")}
<table>
<thead><tr><th style="width:38%">Módulo</th><th>Qué permite</th></tr></thead>
<tbody>
<tr><td><strong>Inicio</strong></td><td>Lo que necesita atención: por preparar, atrasados, en camino, agotados; ventas del día, la semana y el mes.</td></tr>
<tr><td><strong>Pedidos</strong></td><td>Lista con búsqueda y filtros; detalle, estados, guía, notas, historial y correos.</td></tr>
<tr><td><strong>Catálogo</strong></td><td>Vinos, kits prearmados y grupos; precios, fotos, textos e inventario.</td></tr>
<tr><td><strong>Finanzas</strong></td><td>Liquidaciones con el aliado, transferencias y exportación.</td></tr>
<tr><td><strong>Marquesina</strong></td><td>Mensajes de la barra superior, programables.</td></tr>
<tr><td><strong>Códigos</strong></td><td>Códigos de descuento y su enlace para compartir.</td></tr>
<tr><td><strong>Contenido</strong></td><td>Uso del Quiz IA, Wine Scan y el blog.</td></tr>
<tr><td><strong>Comunidad</strong></td><td>Lista de espera, correos del quiz, guías y consentimientos; exportar.</td></tr>
<tr><td><strong>Configuración</strong></td><td>Mi cuenta, equipo (invitar y roles) y aliados.</td></tr>
<tr><td><strong>Auditoría · Correos</strong></td><td>Quién cambió qué y cuándo; registro de cada correo enviado.</td></tr>
</tbody></table>
</div>
""", "Módulos del panel")

pagina(f"""
<p class="eti">03 · Operación diaria</p>
<h2>Pedidos, inventario y finanzas.</h2>
<div class="duo">{img(A + "pedido-por-preparar.png", "Detalle de un pedido.")}{img(A + "vinos.png", "Inventario de los vinos.")}</div>
<div class="g3">
  <div class="card"><span class="tag">Pedidos</span><p>Siete estados (pago pendiente, por preparar, preparando, en camino, entregado, cancelado y venció sin pago). Cada paso es un botón y deja rastro de quién lo hizo. Solo un administrador puede cancelar, y nunca después de enviado. La paquetería del aliado (Tres Guerras) va primero en la lista.</p></div>
  <div class="card"><span class="tag">Inventario</span><p>Existencias por vino con − / + y "fijar" para el conteo físico, historial de movimientos, descuento automático al pagarse un pedido, devolución al cancelarse y avisos por correo con 3 botellas o menos y al agotarse.</p></div>
  <div class="card"><span class="tag">Finanzas (modelo broker)</span><p>El aliado recibe íntegro su precio acordado por botella; Viviendo Vino fija el precio público y su margen cubre la comisión de Mercado Pago y los descuentos. Saldo del aliado = lo entregado − lo transferido.</p></div>
</div>
""", "Operación diaria")

pagina("""
<p class="eti">03 · Roles y permisos</p>
<h2>Cada persona ve solo lo suyo.</h2>
<p class="lede">El servidor revisa los permisos en cada acción: ocultar un botón nunca es la única defensa.</p>
<table>
<thead><tr><th style="width:40%">Puede…</th><th class="c">Administrador</th><th class="c">Atención</th><th class="c">Aliado</th></tr></thead>
<tbody>
<tr><td>Ver pedidos y su detalle</td><td class="c si">Todos</td><td class="c si">Todos</td><td class="c parcial">Solo los suyos</td></tr>
<tr><td>Preparar, enviar y entregar</td><td class="c si">✓</td><td class="c si">✓</td><td class="c parcial">Los suyos</td></tr>
<tr><td>Cancelar un pedido</td><td class="c si">✓</td><td class="c no">—</td><td class="c no">—</td></tr>
<tr><td>Ver el correo del cliente</td><td class="c si">✓</td><td class="c si">✓</td><td class="c no">—</td></tr>
<tr><td>Ver total cobrado</td><td class="c si">✓</td><td class="c si">✓</td><td class="c no">—</td></tr>
<tr><td>Ver margen y comisión de Mercado Pago</td><td class="c si">✓</td><td class="c no">—</td><td class="c no">—</td></tr>
<tr><td>Ver lo que le toca al aliado</td><td class="c si">✓</td><td class="c no">—</td><td class="c parcial">Lo suyo</td></tr>
<tr><td>Llevar el inventario</td><td class="c si">✓</td><td class="c no">Consulta</td><td class="c parcial">Sus vinos</td></tr>
<tr><td>Cambiar precios, fotos, textos, grupos y kits</td><td class="c si">✓</td><td class="c no">—</td><td class="c no">—</td></tr>
<tr><td>Finanzas y transferencias</td><td class="c si">✓</td><td class="c no">—</td><td class="c parcial">Consulta de lo suyo</td></tr>
<tr><td>Códigos, marquesina, contenido y comunidad</td><td class="c si">✓</td><td class="c no">—</td><td class="c no">—</td></tr>
<tr><td>Invitar personas y dar de alta aliados</td><td class="c si">✓</td><td class="c no">—</td><td class="c no">—</td></tr>
<tr><td>Auditoría y registro de correos</td><td class="c si">✓</td><td class="c no">—</td><td class="c no">—</td></tr>
</tbody></table>
<div class="g2">
  <div class="card"><span class="tag">Acceso</span><p>Invitación por correo con enlace de un solo uso (vence en 1 hora), contraseña de al menos 10 caracteres, sesión de 12 horas, bloqueo tras varios intentos fallidos y código en dos pasos opcional.</p></div>
  <div class="card"><span class="tag">Aliado</span><p>In Vino Veritas ya tiene su acceso y un manual visual de 15 páginas para operar pedidos, inventario y finanzas.</p></div>
</div>
""", "Roles y permisos")

# ---------------------------------------------------------------- 04 Tecnología
capitulo("04", "La plataforma técnica.", "Cómo está construida la tienda, dónde vive cada pieza, cómo se publica un cambio y qué la mantiene segura, rápida y visible en Google.", "Arquitectura, ambientes, seguridad, SEO, medición y calidad")

pagina("""
<p class="eti">04 · Arquitectura</p>
<h2>Piezas modernas, cada una en su lugar.</h2>
<div class="arq">
  <div class="col"><span class="titulo">Quien usa el sitio</span>
    <div class="box"><b>Clientes</b>Celular o computadora, en www.viviendovino.com.</div>
    <div class="box"><b>Equipo y aliado</b>Panel en /admin, con su rol.</div>
    <div class="box"><b>Google y redes</b>Buscador, WhatsApp, Facebook: leen títulos, imágenes y datos estructurados.</div>
  </div>
  <div class="col centro"><span class="titulo">La aplicación</span>
    <div class="box main"><b>Next.js en Vercel</b>Una sola aplicación para la tienda, el panel y sus servicios internos. Páginas pre-generadas y en caché para cargar rápido; las acciones sensibles (precios, pagos, permisos) corren solo en el servidor.</div>
    <div class="box"><b>GitHub</b>Código y su historial; cada publicación sale de aquí.</div>
  </div>
  <div class="col"><span class="titulo">Servicios conectados</span>
    <div class="box"><b>Supabase</b>Base de datos (Postgres), accesos y fotos.</div>
    <div class="box"><b>Mercado Pago</b>Cobro con tarjeta y avisos de pago.</div>
    <div class="box"><b>Resend</b>Envío de correos.</div>
    <div class="box"><b>Anthropic</b>IA de Wine Scan y Quiz.</div>
    <div class="box"><b>Google</b>Analytics y Search Console.</div>
  </div>
</div>
<table>
<thead><tr><th style="width:22%">Servicio</th><th>Uso en la tienda</th></tr></thead>
<tbody>
<tr><td><strong>Vercel</strong></td><td>Hospeda el sitio, publica cada cambio de GitHub y sirve el dominio con certificado seguro (https).</td></tr>
<tr><td><strong>Supabase</strong></td><td>Catálogo, pedidos, pagos, inventario, códigos, lista de espera, quiz, Wine Scan, equipo, auditoría y correos; seguridad por filas en cada tabla.</td></tr>
<tr><td><strong>Mercado Pago</strong></td><td>Formulario de tarjeta dentro del checkout, órdenes de pago y avisos firmados (webhook) que confirman cada cobro.</td></tr>
<tr><td><strong>Resend</strong></td><td>Correos transaccionales y de la lista de espera desde el dominio de la marca.</td></tr>
<tr><td><strong>Anthropic</strong></td><td>Modelos de inteligencia artificial para leer etiquetas (Wine Scan) y explicar el perfil del Quiz.</td></tr>
<tr><td><strong>GitHub Actions</strong></td><td>Tarea cada hora que envía los correos programados de la lista de espera.</td></tr>
<tr><td><strong>Google</strong></td><td>Analytics 4 (medición sin datos personales) y Search Console (indexación).</td></tr>
<tr><td><strong>Behold</strong></td><td>Trae las publicaciones de Instagram a la portada.</td></tr>
</tbody></table>
""", "Arquitectura")

pagina("""
<p class="eti">04 · Ambientes y publicación</p>
<h2>Probar en dev, publicar con aprobación.</h2>
<div class="g2">
  <div class="card"><span class="tag">Dev · dev.viviendovino.com</span><ul>
    <li>Copia privada con contraseña, para revisar cada cambio antes de publicarlo.</li>
    <li>Usa su propia base de datos y credenciales de prueba: nunca cobra ni toca datos reales.</li>
    <li>Nunca se indexa en Google.</li>
  </ul></div>
  <div class="card"><span class="tag">Producción · www.viviendovino.com</span><ul>
    <li>Solo recibe cambios ya revisados en dev y con aprobación expresa.</li>
    <li>Credenciales de producción guardadas en Vercel, nunca en el código ni en el navegador.</li>
    <li>Interruptor de apertura (STORE_OPEN): con la tienda cerrada solo existen la lista de espera y el panel.</li>
  </ul></div>
</div>
<h3>Cómo se publica un cambio</h3>
<div class="flujo">
  <div><b>Solicitud</b>Se describe el cambio y su objetivo.</div>
  <div><b>Desarrollo</b>Se hace y se revisa (pruebas, tipos, estilo).</div>
  <div><b>Revisión en dev</b>Se ve y se prueba en la copia privada.</div>
  <div><b>Publicación</b>Con el "sí, publica", pasa a producción y Vercel lo despliega.</div>
</div>
<h3>Configuración (variables de Vercel)</h3>
<p class="small muted">Sus valores están en el archivo de accesos entregado a Rafael Aguirre; este documento no incluye ninguna clave ni contraseña.</p>
<table>
<thead><tr><th style="width:36%">Grupo</th><th>Variables</th></tr></thead>
<tbody>
<tr><td>Base de datos</td><td class="small">NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY · SUPABASE_SECRET_KEY</td></tr>
<tr><td>Pagos</td><td class="small">NEXT_PUBLIC_MP_PUBLIC_KEY · MP_ACCESS_TOKEN · MP_WEBHOOK_SECRET</td></tr>
<tr><td>Correos</td><td class="small">RESEND_API_KEY · EMAIL_FROM · WAITLIST_NOTIFY_TO</td></tr>
<tr><td>Inteligencia artificial</td><td class="small">ANTHROPIC_API_KEY · WINE_SCAN_IP_SALT</td></tr>
<tr><td>Lista de espera y tareas</td><td class="small">NEXT_PUBLIC_LAUNCH_AT · WAITLIST_TOKEN_SECRET · WAITLIST_SEQUENCE_ENABLED · CRON_SECRET</td></tr>
<tr><td>Tienda y medición</td><td class="small">STORE_OPEN · NEXT_PUBLIC_GA_ID · INSTAGRAM_FEED_URL · NEXT_PUBLIC_SITE_URL</td></tr>
<tr><td>Solo en dev</td><td class="small">NEXT_PUBLIC_PREVIEW · PREVIEW_PASSWORD · MP_API_BASE</td></tr>
</tbody></table>
""", "Ambientes y publicación")

pagina("""
<p class="eti">04 · Seguridad y privacidad</p>
<h2>Protección por diseño.</h2>
<div class="g2">
  <div class="card"><span class="tag">Dinero</span><ul>
    <li>El servidor recalcula precios, descuentos y totales con la base de datos; no confía en lo que manda el navegador.</li>
    <li>Cada aviso de pago de Mercado Pago se verifica con su firma antes de tocar un pedido.</li>
    <li>Los datos de la tarjeta nunca pasan por el sitio.</li>
  </ul></div>
  <div class="card"><span class="tag">Claves y accesos</span><ul>
    <li>Las claves de servicio viven solo en el servidor; jamás llegan al navegador.</li>
    <li>Sesiones del panel con token aleatorio, 12 horas, bloqueo por intentos y permisos revisados en cada acción.</li>
    <li>Registro de auditoría de cada cambio en el panel.</li>
  </ul></div>
  <div class="card"><span class="tag">Formularios</span><ul>
    <li>Validación en el servidor de todos los datos.</li>
    <li>Protección contra robots y spam (campo trampa, tiempo mínimo, límites por dirección IP) en lista de espera, contacto, guías, quiz y Wine Scan.</li>
  </ul></div>
  <div class="card"><span class="tag">Datos personales</span><ul>
    <li>Aviso de privacidad conforme a la Ley vigente, con derechos ARCO y proveedores.</li>
    <li>Consentimiento para promociones con casilla sin marcar; baja con un clic.</li>
    <li>Sin correos en direcciones web ni en registros del servidor; Analytics sin datos personales ni publicidad personalizada.</li>
  </ul></div>
</div>
<div class="nota ciruela"><p><strong>Venta responsable.</strong> Verificación de mayoría de edad al entrar y al comprar; la paquetería entrega solo a mayores de 18 años.</p></div>
""", "Seguridad y privacidad")

pagina(f"""
<p class="eti">04 · SEO y medición</p>
<h2>Visible en Google, compartible y medible.</h2>
<div class="lado">
<div>
<ul>
  <li><strong>Metadatos completos</strong> en cada página: título, descripción y dirección oficial (canónica).</li>
  <li><strong>Imágenes para compartir</strong> con la marca por sección y por vino (sin precios), y una por cada promoción.</li>
  <li><strong>Datos estructurados</strong> para Google: tienda, producto con envío incluido y política de devolución, migas de pan, preguntas frecuentes, artículos, servicios y herramientas.</li>
  <li><strong>Sitemap</strong> con 42 páginas e imágenes; robots.txt que deja fuera carrito, checkout, panel y áreas privadas.</li>
  <li><strong>Search Console</strong> verificado; páginas principales enviadas y el resto en indexación por prioridad.</li>
  <li><strong>Velocidad</strong>: fotos en AVIF/WebP por tamaño de pantalla, estilos incrustados y páginas en caché.</li>
</ul>
<table>
<thead><tr><th>PageSpeed · móvil</th><th class="c">Resultado</th></tr></thead>
<tbody><tr><td>Rendimiento</td><td class="c si">95</td></tr><tr><td>Accesibilidad</td><td class="c si">100</td></tr><tr><td>Prácticas recomendadas</td><td class="c si">100</td></tr><tr><td>SEO</td><td class="c si">100</td></tr></tbody></table>
</div>
{img("../seo/previews/imagenes-para-compartir.jpg", "Imágenes para compartir de las secciones y los vinos.")}
</div>
<h3>Google Analytics 4: qué se mide</h3>
<p class="small">Vistas de página, agregar al carrito, inicio de pago, compra (con folio y monto), Wine Scan, avance del quiz, formularios y guías (evento clave), clics a WhatsApp, teléfono y correo. Nunca nombre, correo ni teléfono. Para las ventas, el dato oficial es el panel.</p>
""", "SEO y medición")

pagina("""
<p class="eti">04 · Calidad</p>
<h2>Probado antes de cada publicación.</h2>
<div class="g2">
  <div class="card"><span class="tag">Pruebas automáticas</span><p><strong>180 pruebas</strong> revisan las reglas del negocio: el interruptor de apertura, el kit de 6, el checkout, los descuentos, el inventario y los apartados, los pedidos y el reparto con el aliado, Mercado Pago, el quiz, Wine Scan, el blog, la lista de espera y su regalo, el contacto, los servicios y las promociones.</p></div>
  <div class="card"><span class="tag">Antes de publicar</span><p>Cada cambio pasa por la revisión de tipos y de estilo del código, las pruebas y una compilación completa; después se revisa en dev y solo entonces se publica.</p></div>
  <div class="card"><span class="tag">Pruebas reales</span><p>Compra con tarjeta real en producción, aviso de Mercado Pago, correos al cliente y al equipo, y limpieza posterior. Revisión del formulario de pago en Chrome, Safari (iPad) y Firefox.</p></div>
  <div class="card"><span class="tag">Accesibilidad y diseño</span><p>Contraste, navegación con teclado, textos alternativos y un solo título principal por página; sistema de diseño con los tokens de la marca (DESIGN.md) y tema claro con el vino como acento.</p></div>
</div>
""", "Calidad")

# ---------------------------------------------------------------- 05 Cierre
capitulo("05", "Entrega y siguiente etapa.", "Lo que se entrega con esta fase, lo que conviene atender pronto y cómo seguimos a partir de diciembre.", "Entregables, pendientes conocidos y mantenimiento")

pagina("""
<p class="eti">05 · Entregables</p>
<h2>Lo que queda en manos de Viviendo Vino.</h2>
<table>
<thead><tr><th style="width:32%">Entregable</th><th>Detalle</th></tr></thead>
<tbody>
<tr><td><strong>Tienda en producción</strong></td><td>www.viviendovino.com, con el dominio, el certificado y la versión de dev para pruebas.</td></tr>
<tr><td><strong>Panel de administración</strong></td><td>www.viviendovino.com/admin, con el equipo, el aliado y sus permisos configurados.</td></tr>
<tr><td><strong>Código fuente</strong></td><td>Repositorio en GitHub con todo el historial, las migraciones de la base de datos y las pruebas.</td></tr>
<tr><td><strong>Accesos y variables</strong></td><td>Archivo con las llaves, contraseñas y variables de cada servicio, entregado a Rafael Aguirre.</td></tr>
<tr><td><strong>Manual del aliado</strong></td><td>PDF visual de 15 páginas para operar pedidos, inventario y finanzas.</td></tr>
<tr><td><strong>Plan de indexación</strong></td><td>Excel con las 42 URLs por prioridad para Search Console.</td></tr>
<tr><td><strong>Documentación interna</strong></td><td>Guía del panel (docs/ADMIN.md), sistema de diseño (DESIGN.md), documentos de servicios y legales, y este documento.</td></tr>
<tr><td><strong>Contenido</strong></td><td>Seis artículos, guías en PDF (maridaje, temperatura y seis perfiles del quiz), textos de servicios y legales.</td></tr>
<tr><td><strong>Cuentas conectadas</strong></td><td>Vercel, Supabase, GitHub, Mercado Pago (producción), Resend, Anthropic, Google Analytics y Search Console.</td></tr>
</tbody></table>
""", "Entregables")

pagina("""
<p class="eti">05 · Pendientes conocidos</p>
<h2>Para atender en la siguiente etapa.</h2>
<p class="lede">Nada de esto impide operar; son detalles identificados durante el lanzamiento.</p>
<table>
<thead><tr><th style="width:34%">Tema</th><th>Situación y propuesta</th></tr></thead>
<tbody>
<tr><td><strong>Indexación en Google</strong></td><td>Solicitudes de prioridad 2 en curso (unas 10 por día); revisar el informe de páginas en las próximas semanas.</td></tr>
<tr><td><strong>Navegadores con bloqueo estricto</strong></td><td>Firefox en modo estricto y algunos bloqueadores impiden cargar el formulario de Mercado Pago. Propuesta: un mensaje que explique cómo desbloquearlo.</td></tr>
<tr><td><strong>Páginas que no existen</strong></td><td>Una dirección inexistente muestra "no existe" pero responde como página válida (marcada para no indexarse). Propuesta: respuesta 404 real.</td></tr>
<tr><td><strong>Código en dos pasos</strong></td><td>Es opcional y no hay botón para quitárselo a otra persona si pierde su celular (se resuelve con soporte técnico). Propuesta: botón en Equipo.</td></tr>
<tr><td><strong>Texto del panel de Aliados</strong></td><td>La ayuda del margen mínimo dice "Recomendado: 15"; la regla vigente es 20 %. Ajuste de texto.</td></tr>
<tr><td><strong>Grupos de botella</strong></td><td>Los nombres y fotos de los cuatro grupos también viven en el código; un aliado nuevo con grupos nuevos requiere un ajuste técnico.</td></tr>
<tr><td><strong>Vinos nuevos</strong></td><td>Al agregar un vino con foto nueva, su imagen para compartir necesita generar el recorte (un comando).</td></tr>
<tr><td><strong>Datos fiscales</strong></td><td>Por confirmar: quién factura (en principio el aliado) y la razón social y RFC para el pie del sitio.</td></tr>
<tr><td><strong>Dependencias</strong></td><td>Aplicar las actualizaciones de seguridad de Next.js y demás librerías como parte del mantenimiento.</td></tr>
</tbody></table>
""", "Pendientes conocidos")

pagina("""
<p class="eti">05 · Siguiente etapa</p>
<h2>Desde diciembre: mantenimiento y mejora continua.</h2>
<div class="g2">
  <div class="card"><span class="tag">Mantenimiento</span><ul>
    <li>Monitoreo del sitio, los pagos, los correos y las tareas programadas.</li>
    <li>Actualizaciones de seguridad de la plataforma y sus librerías.</li>
    <li>Atención a fallas y ajustes de operación con el equipo y el aliado.</li>
    <li>Cuidado de la base de datos y de los accesos.</li>
  </ul></div>
  <div class="card"><span class="tag">Mejora continua</span><ul>
    <li>Ajustes de contenido, precios, campañas y promociones.</li>
    <li>Seguimiento de Search Console y Analytics para mejorar visibilidad y conversión.</li>
    <li>Nuevas funciones priorizadas en conjunto.</li>
  </ul></div>
</div>
<h3>Ideas sugeridas para priorizar</h3>
<div class="g3">
  <div class="card"><h4>Operación</h4><p>Botón para restablecer el código en dos pasos, grupos editables desde el panel, alta guiada de nuevos aliados y reportes de ventas por periodo.</p></div>
  <div class="card"><h4>Venta</h4><p>Reseñas de clientes, kits de temporada y regalos, recompra fácil del último kit y venta de botellas sueltas (la base ya lo contempla).</p></div>
  <div class="card"><h4>Visibilidad</h4><p>Nuevos artículos y guías, Google Merchant Center (revisando primero la política para vino en México) y campañas con enlaces de promoción.</p></div>
</div>
<div class="nota"><p><strong>Cómo pedir un cambio.</strong> Se describe la necesidad, se desarrolla y se revisa en dev.viviendovino.com, y se publica en producción solo con la aprobación de Viviendo Vino.</p></div>
""", "Siguiente etapa")

# ---------------------------------------------------------------- Contraportada
pagina("""
<img class="logo" src="../../public/brand/logo-fondo-oscuro.svg" alt="Viviendo Vino">
<div class="centro">
  <p class="eti">Fase 1 · Concluida</p>
  <h1>¡Salud por<br><em>la apertura!</em></h1>
  <p class="bajada">Gracias por la confianza para construir la tienda en línea de Viviendo Vino. Seguimos a partir de diciembre con el mantenimiento y la mejora continua.</p>
  <div class="datos">
    <div><span>Preparado por</span><span>LABS by Publifix</span></div>
    <div><span>Sitio</span><span>www.viviendovino.com</span></div>
    <div><span>Fecha</span><span>19 de noviembre de 2026</span></div>
  </div>
</div>
<div class="meta"><span>Documento informativo</span><span>Las capturas usan datos de ejemplo</span></div>
""", "", "oscura")

# ---------------------------------------------------------------- Índice
filas = "".join(
    f'<li><span class="n">{n}</span><span class="t">{t.rstrip(".")}<small>{r}</small></span><span class="p">{p:02d}</span></li>'
    for n, t, r, p in INDICE
)
PAGINAS[INDICE_POS - 1] = (
    f"""<p class="eti">Contenido</p>
<h2>Cierre de proyecto · Fase 1.</h2>
<p class="lede">Un recorrido por todo lo construido para el lanzamiento de www.viviendovino.com, del sitio público a la plataforma técnica, y cómo seguimos.</p>
<ol class="indice">{filas}</ol>
<div class="nota" style="margin-top:22px"><p><strong>Sobre las imágenes.</strong> Las capturas de la tienda y del panel se tomaron de una copia del sitio con datos de ejemplo: los pedidos, clientes, montos e inventario que aparecen no son reales. Este documento no incluye claves, contraseñas ni montos.</p></div>""",
    "Contenido",
    "",
)

total = len(PAGINAS)
html = []
for i, (cuerpo, pie, clase) in enumerate(PAGINAS, 1):
    pie_html = "" if clase == "oscura" else f'<div class="pie"><span>Viviendo Vino · Cierre de proyecto · {pie}</span><span>{i:02d} / {total:02d}</span></div>'
    html.append(f'<section class="page {clase}">{cuerpo}{pie_html}</section>')

doc = f"""<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><title>Cierre de proyecto · Viviendo Vino</title>
<link rel="stylesheet" href="cierre.css"></head><body>
{''.join(html)}
</body></html>"""
(AQUI / "cierre-proyecto.html").write_text(doc)
print("cierre-proyecto.html:", total, "páginas")
