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
- La **marquesina** pasa a editarse en Contenido, con programación.
- El admin trabaja sobre las tablas que ya existen (los 19 vinos no se recargan). Las migraciones solo agregan.
  Después de abrir el admin en producción, `supabase/seed/catalogo-completo.sql` **no se vuelve a correr**:
  reescribe precios y textos con los originales.

## Equipo inicial

| Persona | Correo | Rol |
|---|---|---|
| Rafael Aguirre | raguirre@continentalmedia.com.mx | admin |
| José Bermúdez | labs.publifix@gmail.com | admin |

## Secciones (menú lateral)

| Sección | Contenido | Roles |
|---|---|---|
| Inicio | Ventas del día y la semana, pedidos por preparar y atrasados, vinos agotados, por transferir, alertas | admin; aliado (su parte) |
| Pedidos | Lista con búsqueda; detalle con kits, dirección, edad, regalo, factura, pago e historial; estados; guía; notas | todos (aliado y atención sin montos) |
| Catálogo | Aliados, sus grupos, sus vinos (precio, foto, textos, disponible, activo) y kits prearmados | admin; aliado solo disponible/agotado de sus vinos |
| Finanzas | Libro de liquidaciones, transferencias al aliado, exportación CSV | admin |
| Contenido | Marquesina programable (hora de CDMX) | admin |
| Comunidad | Lista de espera, correos guardados del quiz, guías pedidas, consentimientos; exportar | admin |
| Quiz IA y Wine Scan | Métricas que ya se guardan | admin |
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
- Al guardar en Catálogo o Contenido se invalida el caché de la tienda (`updateTag("catalogo")`), así el cambio
  se ve al momento.
- Fotos nuevas: bucket público `vinos` de Supabase Storage. Las 19 actuales siguen en `public/img/vinos/`.
- Supabase: desactivar el registro público (Authentication → Sign In / Providers → "Allow new users to sign up"
  apagado). Las altas solo las hace el servidor.

## Tablas nuevas

`admin_usuarios`, `admin_sesiones`, `admin_intentos`, `auditoria` (lunes), `anuncios` (miércoles),
`pedidos`, `pedido_kits`, `pedido_botellas`, `pagos`, `eventos_webhook`, `liquidaciones`, `transferencias`,
`envios`, `consentimientos` (viernes; se llenan con el checkout y Mercado Pago).

## Calendario

| Día | Entrega |
|---|---|
| Lun 26 – Mar 27 | Acceso (inicio de sesión, contraseñas, roles), estructura del panel y Catálogo completo |
| Mié 28 | Configuración (equipo, roles, aliado, Mi cuenta con código en dos pasos), Contenido (marquesina) y Auditoría |
| Jue 29 | Comunidad, Quiz IA y Wine Scan, Inicio |
| Vie 30 | Pedidos y Finanzas con su modelo de datos, probados con pedidos de prueba en dev; revisión general |

## Paso a producción (después, con aprobación)

1. Cargar el catálogo en producción (una sola vez).
2. Correr las migraciones del admin.
3. Habilitar solo `/admin` y `/api/admin` en www con su inicio de sesión; la tienda sigue cerrada.
