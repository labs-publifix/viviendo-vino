# Panel de administración (`/admin`)

Plan acordado el 26 de octubre de 2026. Se construye en dev del lunes 26 al viernes 30 de octubre; el paso a
producción (www) se hace después y solo con aprobación expresa.

## Decisiones

- Un solo panel para todo el equipo, con roles: **admin**, **aliado** y **atención**. Cada rol ve solo lo suyo.
- Acceso con **correo y contraseña** en `/admin/acceso`. Sin registro público: un admin da de alta a cada persona
  y le llega un enlace para crear su propia contraseña. "Olvidé mi contraseña" usa el mismo enlace.
- **Código en dos pasos (TOTP) opcional** para cada persona, desde "Mi cuenta".
- Stock por vino: **disponible / agotado** (sin cantidades en la primera versión).
- Los **kits prearmados** se editan en Catálogo.
- La **marquesina** se edita en "Marquesina y anuncios", con programación. "Contenido" agrupa Quiz IA, Wine Scan y blog.
- El admin trabaja sobre las tablas que ya existen (los 19 vinos no se recargan). Las migraciones solo agregan.
  Después de abrir el admin en producción, `supabase/seed/catalogo-completo.sql` **no se vuelve a correr**:
  reescribe precios y textos con los originales.

## Aliados y permisos (decidido el 27 de octubre de 2026)

- **Alta del aliado en Configuración → Aliados** (pestaña junto a Equipo, solo admin): nombre, ciudad y estado,
  margen mínimo y condiciones comerciales. Después, en Configuración → Equipo se invita a su gente con el rol Aliado.
- **Catálogo** queda para los grupos, vinos y kits de cada aliado.
- **El rol Aliado solo puede:** ver sus ventas y sus pedidos, y cambiar un vino suyo entre disponible y agotado.
  **No puede** cambiar precios, textos, fotos, grupos ni kits, ni ver nada de otro aliado.
- **Sus ventas, en solo lectura:** por pedido, lo que le toca a sus precios acordados (modelo broker: nunca ve el
  precio público ni el margen de Viviendo Vino); además, las transferencias que ya se le hicieron y lo que falta por pagarle.
  Llega con Pedidos y Finanzas.
- **Todo lo que toca precios** (precio acordado y precio público de cada vino, kits prearmados, margen mínimo) **solo lo hace un
  administrador.** Se revisa en el servidor en cada acción, no solo ocultando botones.

## Modelo broker (decidido el 28 de octubre de 2026)

- **Precio acordado por botella** (`productos.precio_aliado_centavos`): neto, con IVA y con envío incluido. El
  aliado **siempre lo recibe íntegro**, también si Mercado Pago cobra comisión o si un pedido se cancela.
- **Precio público:** lo fija Viviendo Vino (p. ej. lista $400 − 15 % = $340). El margen es precio público −
  acordado y es de Viviendo Vino. La base no deja guardar un precio público menor al acordado.
- **Mercado Pago lo absorbe Viviendo Vino**, incluidas las cancelaciones. Mientras no hay cobro real se estima con
  3.49 % + $4 más IVA (`comisionMPEstimada`); al conectar Mercado Pago se guarda la comisión real en
  `pagos.comision_proveedor_centavos`.
- **Margen mínimo:** 20 % por defecto (subido de 15 % el 28 oct), editable por aliado en Configuración → Aliados. Con el precio debajo del
  mínimo, el panel lo avisa, propone el precio mínimo y solo deja guardar con una confirmación que queda en la
  Auditoría. Con 20 %, después de Mercado Pago (~4 % + $4.64) quedan ~15 % netos por botella.
- **Quién ve qué:** el admin ve precio público, acordado, margen, Mercado Pago y margen neto; el aliado solo su
  precio acordado y lo que le toca; atención, el total cobrado sin margen ni acordado.
- **Pedidos:** `modelo = 'broker'`; `comision_centavos` guarda el margen bruto, `comision_mp_centavos` la comisión
  de Mercado Pago estimada y `pedido_items.precio_aliado_centavos` el acordado de cada botella.
- **Textos con precio:** la marquesina usa la marca `{desde}` (precio del kit más barato del momento) y los rangos de
  presupuesto del quiz se calculan con los precios de hoy; así no quedan precios viejos al cambiar el catálogo.
- **Pendiente de confirmar:** facturación (en principio factura el aliado).

## Pedidos y Finanzas (27 de octubre de 2026)

- **Estados:** Pago pendiente → Por preparar (pagado) → Preparando → En camino (con paquetería y guía) → Entregado.
  Cancelar pide motivo, solo lo hace un admin y nunca después de enviado. El pago lo confirma Mercado Pago; a mano
  solo se marca pagado un pedido de prueba.
- **Quién hace qué:** admin, atención y el aliado dueño mueven el pedido (preparar, enviar, entregar) y dejan notas.
  Atención ve el total cobrado, pero no el margen ni los precios acordados. El aliado no ve el correo del cliente (sí nombre, teléfono y dirección).
- **El pedido conserva lo que se cobró:** precios públicos y acordados, nombres de vinos y margen se copian al crearlo. El servidor los
  toma de la base en ese momento (sin caché), nunca del navegador.
- **Reparto (modelo broker, ver abajo):** el aliado recibe Σ precio acordado × botellas; el margen bruto de
  Viviendo Vino es el total cobrado menos eso (`repartoBroker` en `lib/admin/pedidos-rules.ts`).
- **Saldo del aliado:** lo suyo de pedidos **entregados** menos lo transferido. Lo de pedidos pagados que aún no se
  entregan aparece aparte como "En camino". Las transferencias las registra un admin.
- **Pedidos de prueba:** botón solo en dev (nunca en producción), con cliente inventado `@example.com` y la etiqueta
  "prueba" en todos lados.

## Precio antes y descuento (decidido el 27 de octubre de 2026)

- Cada vino tiene **precio final** (`precio_centavos`, lo único que se cobra; el servidor siempre recalcula con la
  base) y, opcional, **precio antes** (`precio_antes_centavos`).
- Si el precio antes es mayor que el final, la tienda lo muestra **tachado** junto al final y el **% de descuento**
  calculado por la plataforma: redondeo de (antes − final) ÷ antes. Ejemplo: 380 y 300 → −21 %. Sin precio antes,
  la tienda se ve igual que siempre.
- Se ve en la tarjeta de vino (catálogo, armador, blog) y en la ficha. Los totales de kits suman precios finales.
- En los kits, si alguna botella tiene precio antes, se muestra **"Ahorras $X"** bajo el total: suma de
  (antes − final) × cantidad. Aparece en los kits prearmados (inicio y ficha), el kit que se arma, cada kit del
  carrito, el total del carrito y las cajas del Quiz IA. Sin descuentos no aparece.
- Solo un administrador lo edita (Catálogo → vino → Precio). La base rechaza un precio antes que no sea mayor que
  el final.

## Equipo inicial

| Persona | Correo | Rol |
|---|---|---|
| Rafael Aguirre | raguirre@continentalmedia.com.mx | admin |
| José Bermúdez | labs.publifix@gmail.com | admin |

## Secciones (menú lateral)

Agrupadas en Operación (Inicio, Pedidos, Catálogo, Finanzas), Sitio (Marquesina y anuncios, Contenido,
Comunidad) y Sistema (Configuración, Auditoría). En escritorio la barra se colapsa a íconos y se recuerda; en el
celular el menú se abre de lado desde la barra superior.

| Sección | Contenido | Roles |
|---|---|---|
| Inicio | Ventas del día y la semana, pedidos por preparar y atrasados, vinos agotados, por transferir, alertas | admin; aliado (su parte) |
| Pedidos | Lista con búsqueda; detalle con kits, dirección, edad, regalo, factura, pago e historial; estados; guía; notas | todos (atención sin montos; aliado solo los suyos, con montos) |
| Catálogo | Grupos, vinos (precio, foto, textos, disponible, activo) y kits prearmados de cada aliado | admin; aliado solo disponible/agotado de sus vinos |
| Finanzas | Libro de liquidaciones, transferencias al aliado, exportación CSV | admin; aliado solo lectura de lo suyo (ventas, comisión, lo que le toca, transferencias y saldo) |
| Marquesina y anuncios | Mensajes de la barra superior de la tienda, programables (hora de CDMX) | admin |
| Contenido | Tres frentes en pestañas: Quiz IA, Wine Scan y Blog y guías (uso y lo publicado) | admin |
| Comunidad | Lista de espera, correos guardados del quiz, guías pedidas, consentimientos; exportar | admin |
| Configuración | Mi cuenta (todos), Equipo y Aliados (alta y condiciones comerciales; solo admin) | admin; cada quien su cuenta |
| Auditoría | Quién cambió qué, cuándo, valor anterior y nuevo | admin, solo lectura |

## Técnica

- Rutas en `app/admin/` (fuera de la tienda: sin encabezado, pie ni aviso de edad). `noindex` siempre.
- Credenciales con Supabase Auth (correo y contraseña, TOTP). La sesión del panel es una cookie propia
  `vv_admin` (httpOnly, 12 h) con un token aleatorio cuyo hash vive en `admin_sesiones`; cerrar sesión la borra.
  Ningún token de Supabase llega al navegador.
- Toda lectura y escritura del panel pasa por el servidor con la secret key; **cada server action vuelve a
  revisar la sesión y el rol** (no basta con ocultar botones).
- Cada cambio queda en `auditoria` (antes y después).
- Al guardar se invalida el caché de la tienda (`updateTag("catalogo")` en Catálogo, `updateTag("anuncios")` en
  Marquesina y anuncios), así el cambio se ve al momento.
- Fotos nuevas: bucket público `vinos` de Supabase Storage. Las 19 actuales siguen en `public/img/vinos/`.
- Supabase: desactivar el registro público (Authentication → Sign In / Providers → "Allow new users to sign up"
  apagado). Las altas solo las hace el servidor.

## Tablas nuevas

`admin_usuarios`, `admin_sesiones`, `admin_intentos`, `auditoria` (lunes), `anuncios` (lunes 26, migración
`20261028000000_anuncios.sql`; si la tabla no existe, la tienda usa los mensajes de siempre), `aliados_datos` y la
función `admin_guardar_kit_items` (martes 27, `20261029000000_catalogo_admin.sql`),
`pedidos`, `pedido_kits`, `pedido_botellas`, `pagos`, `eventos_webhook`, `liquidaciones`, `transferencias`,
`envios`, `consentimientos` (viernes; se llenan con el checkout y Mercado Pago).

## Estado (cierre del lunes 26 de octubre de 2026)

| Sección | Estado | Ruta |
|---|---|---|
| Acceso, contraseñas, sesiones y roles | Hecho | `/admin/acceso`, `/admin/recuperar`, `/admin/contrasena` |
| Estructura del panel (menú colapsable, celular) | Hecho | `/admin` |
| Comunidad | Hecho | `/admin/comunidad` |
| Marquesina y anuncios | Hecho | `/admin/anuncios` |
| Contenido (Quiz IA, Wine Scan, blog) | Hecho | `/admin/contenido` |
| Configuración (Mi cuenta y Equipo) | Hecho (27 oct) | `/admin/configuracion` |
| Auditoría | Hecho (27 oct) | `/admin/auditoria` |
| Catálogo (vinos, kits y grupos) | Hecho (27 oct) | `/admin/catalogo` |
| Configuración → Aliados | Hecho (27 oct) | `/admin/configuracion/aliados` |
| Inicio (tablero) | Hecho (27 oct) | `/admin` |
| Pedidos | Hecho sin cobro (27 oct): pedidos de prueba en dev | `/admin/pedidos` |
| Finanzas | Hecho sin cobro (27 oct) | `/admin/finanzas` |

### Pendientes del admin

**Por construir**
- [x] Configuración: Mi cuenta (nombre, contraseña, código en dos pasos opcional, cerrar otras sesiones) y Equipo
  (invitar, editar nombre y rol, quitar o devolver acceso, reenviar enlace). Siempre queda al menos un admin.
- [x] Auditoría: línea de tiempo por día con filtros por persona y sección, y el antes y después de cada cambio.
  Registra también la entrada y salida del panel.
- [x] Configuración → Aliados: alta y edición (empresa, margen mínimo, días de preparación, texto de entrega y datos
  privados: razón social, RFC, contacto y CLABE validada) y pausa. El de Córdoba es In Vino Veritas. La comisión
  ya no es legible con la llave pública.
- [x] Catálogo: vinos (precio, foto al bucket `vinos` recortada a 880×1184, textos, disponible/agotado, mostrar u
  ocultar), alta de vinos, kits prearmados (6 del mismo grupo, guardado en una transacción) y vista de grupos. Rol
  aliado: solo disponible/agotado de sus vinos; el servidor rechaza cualquier otro cambio. Al guardar, la tienda
  se actualiza y se regenera en segundo plano para que la primera visita ya vea el cambio.
- [x] Kits prearmados: foto propia (subida y recortada a 880×660, `20261101000000_kits_foto.sql`) y eliminar con
  confirmación (solo admin; los pedidos conservan su copia). La tienda usa la foto subida y, si no hay, la original
  de `KIT_IMAGES` (aprobado el 27 oct: solo cambia de dónde sale la foto).
- [ ] Grupos editables y grupos de aliados nuevos: hoy los nombres y fotos de los 4 grupos (azul, rojo, verde,
  amarillo) viven también en el código de la tienda (`GROUP_LABELS`, `lib/catalog/media.ts`). Un aliado nuevo
  necesita sus grupos y que la tienda los muestre: es un cambio de front que se hace con aprobación.
- [x] Inicio (`20261103000000_inicio.sql`): la base calcula todo el tablero en una llamada (`admin_inicio`), así que
  no se vuelve lento al acumular datos. Lo que necesita atención (por preparar, atrasados según el plazo del aliado,
  en camino, entregados hoy, agotados, correos que no salieron) con enlaces filtrados; ventas de hoy, 7 días y mes
  con la serie de 30 días; saldo por aliado; comunidad y contenido de la semana. Atención sin montos; el aliado
  solo lo suyo; comunidad solo admin.
- [x] Pedidos y Finanzas sin cobro (`20261031000000_pedidos.sql`): pedidos con kits, botellas, precios y comisión
  copiados al crearlos; historial; pagos; transferencias. Probado con pedidos de prueba en dev.
- [x] Correos de pedido (27 oct): al cliente "Recibimos tu pedido" (al quedar pagado), "Va en camino" (paquetería y
  guía, sin enlace de rastreo porque no hay integración con paqueterías) y "Entregado"; al equipo (admin, atención y
  la gente del aliado) "Nuevo pedido por preparar", sin datos de contacto del cliente. Los pedidos de prueba se
  mandan a labs.publifix@gmail.com o raguirre@continentalmedia.com.mx y llevan "[Prueba]" en el asunto.
- [x] Registro de correos (`20261102000000_correos.sql`): cada correo de pedido (cliente y equipo), del perfil del
  quiz y de las guías del blog queda en `correos_enviados`. Se ve en el historial de cada pedido (con "Reenviar al
  cliente" / "Reintentar envío" para admin y atención; el aliado no ve los correos) y en Sistema → Correos (admin).
- [ ] Correos, más adelante: seguimiento de entrega (entregado, rebotó, abierto) con los avisos (webhooks) de Resend,
  y sumar a la vista los correos de la lista de espera (hoy están en `waitlist_email_sends`).
- [x] Modelo broker (`20261104000000_broker.sql`): precio acordado por vino con calculadora de descuento y margen en
  vivo, margen mínimo por aliado, pedidos con margen y Mercado Pago estimado, vista de cada rol en Pedidos, Finanzas
  e Inicio, marquesina y rangos del quiz con precios del momento.
- [ ] Conectar el checkout y Mercado Pago a `crearPedido` (lib/admin/pedidos.ts): el pago aprobado pasa el pedido a
  "Por preparar" y se guarda la comisión real de Mercado Pago (la absorbe Viviendo Vino).
- [ ] Facturación: confirmar si factura el aliado.
- [ ] Finanzas: exportar a CSV para contabilidad.
- [ ] Blog: lecturas y vistas por artículo (con GA4 o con un contador propio; decidir).
- [ ] Contenido a escala: hoy las gráficas del Quiz y Wine Scan leen las filas del periodo (tope de 50,000). Cerca de
  ~20,000 al mes, pasar los totales a vistas o funciones SQL (requiere migración). El historial ya está paginado.

**Para el equipo (Supabase)**
- [x] Staging: `20261027000000_admin.sql` corrido; cuenta de José creada.
- [ ] Staging: correr `20261028000000_anuncios.sql` (si aún no se corrió).
- [ ] Staging: apagar "Allow new users to sign up" en Authentication.
- [ ] Rafael: crear su contraseña desde "Es mi primera vez".

**Paso a producción (solo con aprobación expresa)**
- [ ] Cargar el catálogo en producción (una sola vez) y después no volver a correr `catalogo-completo.sql`.
- [ ] Correr en producción las migraciones del admin (`20261027000000_admin.sql`, `20261028000000_anuncios.sql` y
  las que sigan), apagar el registro público y habilitar `/admin` en www con la tienda aún cerrada.
- [ ] Con eso, Comunidad muestra los correos reales de la lista de espera (hoy dev ve solo staging).

## Calendario

| Día | Entrega |
|---|---|
| Lun 26 – Mar 27 | Acceso (inicio de sesión, contraseñas, roles), estructura del panel y Catálogo completo |
| Mié 28 | Configuración (equipo, roles, aliado, Mi cuenta con código en dos pasos), Marquesina y anuncios y Auditoría |
| Jue 29 | Comunidad, Contenido (Quiz IA, Wine Scan y blog), Inicio |
| Vie 30 | Pedidos y Finanzas con su modelo de datos, probados con pedidos de prueba en dev; revisión general |

## Paso a producción (después, con aprobación)

1. Cargar el catálogo en producción (una sola vez).
2. Correr las migraciones del admin.
3. Habilitar solo `/admin` en www con su inicio de sesión; la tienda sigue cerrada (`isAdminPath` en `lib/gate.ts`,
   ya en el código: con la tienda cerrada en producción pasan la lista de espera y `/admin`, nada más).
