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
| Pedidos | Lista con búsqueda; detalle con kits, dirección, edad, regalo, factura, pago e historial; estados; guía; notas | todos (aliado y atención sin montos) |
| Catálogo | Aliados, sus grupos, sus vinos (precio, foto, textos, disponible, activo) y kits prearmados | admin; aliado solo disponible/agotado de sus vinos |
| Finanzas | Libro de liquidaciones, transferencias al aliado, exportación CSV | admin |
| Marquesina y anuncios | Mensajes de la barra superior de la tienda, programables (hora de CDMX) | admin |
| Contenido | Tres frentes en pestañas: Quiz IA, Wine Scan y Blog y guías (uso y lo publicado) | admin |
| Comunidad | Lista de espera, correos guardados del quiz, guías pedidas, consentimientos; exportar | admin |
| Configuración | Equipo y roles, datos del aliado, Mi cuenta (contraseña y código en dos pasos) | admin; cada quien su cuenta |
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
`20261028000000_anuncios.sql`; si la tabla no existe, la tienda usa los mensajes de siempre),
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
| Catálogo | Pendiente | `/admin/catalogo` |
| Inicio (tablero) | Pendiente | `/admin` |
| Pedidos | Pendiente | `/admin/pedidos` |
| Finanzas | Pendiente | `/admin/finanzas` |

### Pendientes del admin

**Por construir**
- [x] Configuración: Mi cuenta (nombre, contraseña, código en dos pasos opcional, cerrar otras sesiones) y Equipo
  (invitar, editar nombre y rol, quitar o devolver acceso, reenviar enlace). Siempre queda al menos un admin.
- [x] Auditoría: línea de tiempo por día con filtros por persona y sección, y el antes y después de cada cambio.
  Registra también la entrada y salida del panel.
- [ ] Datos del aliado (nombre, ciudad, comisión): se editan en Catálogo, junto con sus vinos.
- [ ] Catálogo: aliados, grupos, vinos (precio, foto al bucket `vinos`, textos, disponible/agotado, activo) y kits
  prearmados; generalizar los grupos más allá de azul/rojo/verde/amarillo para aliados nuevos; mover a la base las
  fotos de grupos y kits (`lib/catalog/media.ts`); `updateTag("catalogo")` al guardar. Rol aliado: solo
  disponible/agotado de sus vinos.
- [ ] Inicio: ventas del día y la semana, pedidos por preparar y atrasados, agotados, por transferir, alertas.
- [ ] Pedidos y Finanzas: modelo de datos (pedidos, pagos, liquidaciones, transferencias, envíos,
  consentimientos), probado con pedidos de prueba; se llena de verdad con el checkout y Mercado Pago.
- [ ] Blog: lecturas y vistas por artículo (con GA4 o con un contador propio; decidir).

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
3. Habilitar solo `/admin` y `/api/admin` en www con su inicio de sesión; la tienda sigue cerrada.
