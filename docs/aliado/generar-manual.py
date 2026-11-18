"""Genera docs/aliado/manual-aliado.html (manual del aliado, V2 con capturas anotadas).

Las capturas (docs/aliado/capturas/*.png) y la posición de cada número (capturas/marcas.json) salen de una copia
local del panel con datos de EJEMPLO (clientes inventados). Después: Playwright imprime el HTML a PDF.

    python3 docs/aliado/generar-manual.py
"""
import json
from pathlib import Path

AQUI = Path(__file__).parent
MARCAS = json.loads((AQUI / "capturas" / "marcas.json").read_text())


def captura(nombre, pie, ancho="100%"):
    """Imagen con sus números encima (posiciones en % de la imagen)."""
    d = MARCAS[nombre]
    capas = []
    for m in d["marcas"]:
        capas.append(
            f'<span class="caja" style="left:{m["x"]}%;top:{m["y"]}%;width:{m["w"]}%;height:{m["h"]}%"></span>'
            f'<span class="num" style="left:{m["x"]}%;top:{m["y"] + m["h"] / 2}%">{m["n"]}</span>'
        )
    return (
        f'<figure class="shot" style="width:{ancho}"><div class="marco"><img src="capturas/{nombre}.png" alt="">'
        + "".join(capas)
        + f"</div><figcaption>{pie}</figcaption></figure>"
    )


def leyenda(items):
    return '<ol class="leyenda">' + "".join(f'<li><span class="n">{i + 1}</span><div>{t}</div></li>' for i, t in enumerate(items)) + "</ol>"


PAGINAS = []
num_pag = [1]


def pagina(contenido, etiqueta):
    num_pag[0] += 1
    PAGINAS.append(
        f'<section class="page">{contenido}<div class="pie"><span>Viviendo Vino · Manual del aliado · {etiqueta}</span><span>{num_pag[0]}</span></div></section>'
    )


# ---------- Contenido ----------

pagina(
    """
<p class="eti">Antes de empezar</p>
<h2>Para quién es este manual.</h2>
<p class="lede">Para cualquier persona del equipo del aliado que prepare y envíe pedidos de Viviendo Vino. No necesitas saber de sistemas: cada pantalla viene con números que explican qué hace cada botón.</p>
<div class="grid2">
  <div class="card si"><h3>En el panel tú</h3><ul>
    <li>Ves <strong>tus pedidos</strong> y a quién enviarlos.</li>
    <li>Los avanzas: <strong>preparar → enviar → entregado</strong>.</li>
    <li>Llevas el <strong>inventario</strong> de tus vinos.</li>
    <li>Consultas <strong>tus ventas y tu saldo</strong>.</li></ul></div>
  <div class="card no"><h3>Viviendo Vino se encarga de</h3><ul>
    <li>Cobrar al cliente y atenderlo.</li>
    <li>Precios, fotos y textos de los vinos.</li>
    <li>Cancelaciones y devoluciones de dinero.</li>
    <li>Dar acceso a más personas de tu equipo.</li></ul></div>
</div>
<h3>Contenido</h3>
<ol class="indice">
  <li><span>01</span>Entrar al panel</li><li><span>02</span>La pantalla de inicio</li>
  <li><span>03</span>Tus pedidos</li><li><span>04</span>El camino de un pedido</li>
  <li><span>05</span>Paso 1 · Preparar</li><li><span>06</span>Paso 2 · Enviar</li>
  <li><span>07</span>Paso 3 · Entregado</li><li><span>08</span>Desde el celular</li>
  <li><span>09</span>Tus vinos (inventario)</li><li><span>10</span>Contar y fijar existencias</li>
  <li><span>11</span>Finanzas</li><li><span>12</span>Ayuda y resumen</li>
</ol>
<div class="nota"><p><strong>Las capturas usan datos de ejemplo.</strong> Los pedidos, clientes, montos y existencias que ves aquí son inventados; en tu panel verás los tuyos.</p></div>
""",
    "Introducción",
)

pagina(
    f"""
<p class="eti">01 · Entrar al panel</p>
<h2>Entra con tu correo y tu contraseña.</h2>
<p class="lede">La dirección es <span class="ruta">www.viviendovino.com/admin</span>. Guárdala en favoritos.</p>
{captura("acceso", "Pantalla de entrada al panel.")}
{leyenda([
    "<strong>Correo:</strong> el mismo en el que recibiste la invitación.",
    "<strong>Contraseña:</strong> la que creaste (mínimo 10 caracteres).",
    "<strong>Entrar.</strong> Si activaste el código en dos pasos, después te pide los 6 dígitos de tu app.",
    "<strong>Es mi primera vez:</strong> si el enlace de la invitación ya venció (dura 1 hora), aquí pides uno nuevo para crear tu contraseña.",
    "<strong>Olvidé mi contraseña:</strong> te llega un correo para crear una nueva.",
])}
""",
    "Entrar",
)

pagina(
    f"""
<p class="eti">01 · Entrar al panel</p>
<h2>Protege tu cuenta (recomendado).</h2>
<p class="lede">En <span class="ruta">Configuración → Mi cuenta</span> puedes cambiar tu nombre y tu contraseña, y activar el <strong>código en dos pasos</strong>.</p>
{captura("cuenta", "Configuración → Mi cuenta, sección del código en dos pasos.")}
{leyenda([
    "<strong>Código en dos pasos:</strong> además de tu contraseña, al entrar te pedimos un código de 6 dígitos de una app en tu celular.",
    "<strong>Activar:</strong> escanea el código QR con Google Authenticator, Microsoft Authenticator o similar, y escribe el código que te muestre.",
])}
<div class="nota"><p><strong>Cada persona, su propia cuenta.</strong> No compartas tu contraseña. Si alguien más va a preparar pedidos, pídenos que lo invitemos con su correo.</p></div>
<div class="nota ciruela"><p><strong>¿Vas a cambiar de celular?</strong> Antes, desactiva el código en Mi cuenta y vuelve a activarlo en el nuevo. Si lo perdiste, escríbenos.</p></div>
<h3>Tu primer día</h3>
<ul class="check">
  <li>Creé mi contraseña y entré al panel.</li>
  <li>Activé el código en dos pasos.</li>
  <li>Revisé en <strong>Catálogo</strong> que las existencias coincidan con mi almacén.</li>
  <li>Guardé <span class="ruta">www.viviendovino.com/admin</span> en favoritos.</li>
</ul>
""",
    "Mi cuenta",
)

pagina(
    f"""
<p class="eti">02 · Inicio</p>
<h2>Lo que necesita tu atención hoy.</h2>
<p class="lede">Es lo primero que ves al entrar. Revísalo cada mañana.</p>
{captura("inicio", "Inicio del panel.")}
{leyenda([
    "<strong>Por preparar:</strong> pedidos pagados que aún no salen. Tu lista de trabajo del día.",
    "<strong>Atrasados:</strong> pedidos que ya pasaron el plazo de preparación. Debe estar en 0.",
    "<strong>En camino:</strong> enviados que aún no marcas como entregados.",
    "<strong>Vinos agotados:</strong> vinos en 0 botellas; en la tienda nadie los puede comprar.",
    "<strong>Pocas existencias:</strong> vinos con 3 botellas o menos.",
    "<strong>Tus ventas:</strong> lo vendido hoy, en 7 días y en el mes, y lo que tienes por recibir.",
])}
""",
    "Inicio",
)

pagina(
    f"""
<p class="eti">03 · Pedidos</p>
<h2>Tus pedidos, en una lista.</h2>
<p class="lede">Cuando un cliente paga, te llega un correo <strong>"Nuevo pedido por preparar"</strong> y el pedido aparece aquí.</p>
{captura("pedidos", "Pedidos: la lista completa.")}
{leyenda([
    "<strong>Buscar:</strong> por número de pedido (folio), nombre del cliente o ciudad.",
    "<strong>Filtros:</strong> ve solo los que están por preparar, en camino, entregados o cancelados.",
    "<strong>Folio:</strong> da clic para abrir el pedido (por ejemplo, VV-1008).",
    "<strong>Estado:</strong> en qué paso va cada pedido. La columna <strong>Para ti</strong> es lo que te toca de ese pedido.",
])}
""",
    "Pedidos",
)

pagina(
    """
<p class="eti">04 · El camino de un pedido</p>
<h2>Tres botones, en orden.</h2>
<p class="lede">Cada pedido avanza con un solo botón en la caja <strong>"Siguiente paso"</strong>. El cliente recibe un correo en cada paso importante.</p>
<div class="camino">
  <div class="et"><span class="chip c-ambar">Por preparar</span><p>Pago confirmado.</p></div>
  <div class="bt">Empezar a preparar →</div>
  <div class="et"><span class="chip c-ambar">Preparando</span><p>Estás armando la caja.</p></div>
  <div class="bt">Marcar como enviado →</div>
  <div class="et"><span class="chip c-vino">En camino</span><p>El cliente recibe su guía.</p></div>
  <div class="bt">Marcar como entregado →</div>
  <div class="et"><span class="chip c-ok">Entregado</span><p>Cuenta para tu saldo.</p></div>
</div>
<table>
  <thead><tr><th style="width:24%">Estado</th><th>Qué significa</th><th style="width:34%">Qué haces</th></tr></thead>
  <tbody>
    <tr><td><span class="chip c-gris">Pago pendiente</span></td><td>El cliente está pagando; las botellas quedan apartadas unos minutos.</td><td>Nada todavía.</td></tr>
    <tr><td><span class="chip c-ambar">Por preparar</span></td><td>Mercado Pago confirmó el pago.</td><td><strong>Empezar a preparar</strong> (página 05).</td></tr>
    <tr><td><span class="chip c-ambar">Preparando</span></td><td>La caja está en tus manos.</td><td>Al darla a la paquetería: <strong>Marcar como enviado</strong> (página 06).</td></tr>
    <tr><td><span class="chip c-vino">En camino</span></td><td>El cliente recibió un correo con la paquetería y la guía.</td><td>Cuando llegue: <strong>Marcar como entregado</strong> (página 07).</td></tr>
    <tr><td><span class="chip c-ok">Entregado</span></td><td>El cliente recibió un correo de entrega.</td><td>Nada más.</td></tr>
    <tr><td><span class="chip c-gris">Cancelado</span></td><td>Lo canceló Viviendo Vino antes del envío.</td><td>No lo envíes. Las botellas regresan solas a tu inventario.</td></tr>
    <tr><td><span class="chip c-gris">Venció sin pago</span></td><td>El pago nunca llegó.</td><td>Nada: no es una venta.</td></tr>
  </tbody>
</table>
<div class="nota"><p><strong>Tiempos que prometemos al cliente:</strong> preparar en <strong>1 a 2 días hábiles</strong> y entregar en <strong>hasta 7 días hábiles</strong> desde la compra.</p></div>
""",
    "Ciclo del pedido",
)

pagina(
    f"""
<p class="eti">05 · Paso 1</p>
<h2>Preparar el pedido.</h2>
<p class="lede">Abre el pedido desde la lista. Todo lo que necesitas para armar la caja está en esta pantalla.</p>
{captura("pedido-por-preparar", "Detalle de un pedido por preparar (2 kits).")}
{leyenda([
    "<strong>Qué lleva:</strong> cada kit son <strong>6 botellas</strong>; aquí ves qué vinos y cuántos de cada uno.",
    "<strong>Para ti:</strong> lo que te toca de este pedido, a tus precios acordados.",
    "<strong>Empezar a preparar:</strong> dale clic al empezar a armar la caja; así sabemos que ya está en tus manos.",
    "<strong>Envío:</strong> nombre, dirección y referencias para la guía de la paquetería.",
    "<strong>Cliente:</strong> nombre y teléfono para la paquetería.",
    "<strong>Agregar una nota:</strong> deja aquí cualquier detalle (por ejemplo, dirección incompleta) y avísanos.",
])}
<div class="nota ciruela"><p><strong>"Lleva descorchador":</strong> algunos pedidos de la apertura muestran esta etiqueta. Incluye el descorchador Viviendo Vino en la caja.</p></div>
""",
    "Preparar",
)

pagina(
    f"""
<p class="eti">06 · Paso 2</p>
<h2>Enviar: captura la paquetería y la guía.</h2>
<p class="lede">Cuando entregues la caja a la paquetería, registra el envío. El cliente recibe un correo con su número de guía para rastrearlo.</p>
{captura("pedido-preparando", "Pedido en preparación, con la paquetería y la guía capturadas.")}
{leyenda([
    "<strong>Paquetería:</strong> elige la que usaste (por ejemplo, Tres Guerras).",
    "<strong>Número de guía:</strong> escríbelo exactamente como viene en el comprobante.",
    "<strong>Marcar como enviado:</strong> el pedido pasa a \"En camino\" y el cliente recibe su guía por correo.",
])}
<h3>Antes de cerrar la caja</h3>
<ul class="check cols">
  <li>Vinos, añadas y cantidades iguales al pedido.</li>
  <li>Cápsulas, sellos y etiquetas intactos.</li>
  <li>Empaque firme para 6 botellas, sin movimiento.</li>
  <li>Descorchador incluido, si el pedido lo indica.</li>
  <li>La guía lleva nombre, teléfono y dirección completos.</li>
  <li>Revisa dos veces el número de guía antes de guardarlo.</li>
</ul>
""",
    "Enviar",
)

pagina(
    f"""
<p class="eti">07 · Paso 3</p>
<h2>Entregado: cierra el pedido.</h2>
<p class="lede">Cuando la paquetería confirme la entrega, márcalo. Desde ese momento el pedido cuenta para tu saldo.</p>
{captura("pedido-en-camino", "Pedido en camino.")}
{leyenda([
    "<strong>Marcar como entregado:</strong> el cliente recibe un correo de entrega y el pedido entra a tu saldo.",
    "<strong>Historial:</strong> queda registrada la paquetería y la guía, quién hizo cada paso y cuándo.",
])}
<h3>Situaciones especiales</h3>
<table><tbody>
  <tr><td style="width:34%"><strong>Te falta una botella</strong></td><td>No la cambies por otro vino. Escríbenos antes de enviar.</td></tr>
  <tr><td><strong>Dirección incompleta</strong></td><td>Deja una nota en el pedido y avísanos; contactamos al cliente.</td></tr>
  <tr><td><strong>Solo mayores de edad</strong></td><td>La paquetería puede pedir identificación y no entregar a menores de 18 años.</td></tr>
  <tr><td><strong>El cliente reporta daños</strong></td><td>Nos escribe a nosotros; coordinamos contigo la reposición o devolución.</td></tr>
  <tr><td><strong>Te escribe un cliente</strong></td><td>Canalízalo con Viviendo Vino: somos su único punto de contacto.</td></tr>
</tbody></table>
""",
    "Entregado",
)

pagina(
    f"""
<p class="eti">08 · Desde el celular</p>
<h2>El panel también funciona en el celular.</h2>
<div class="lado">
  {captura("celular-pedido", "El mismo pedido, en un iPhone.", ancho="2.6in")}
  <div>
    <p class="lede" style="margin-top:0">Útil en el almacén: abre el pedido, arma la caja y marca cada paso sin ir a la computadora.</p>
    <ul>
      <li>El menú está en el botón <strong>☰</strong> de arriba a la derecha.</li>
      <li>La caja <strong>"Siguiente paso"</strong> aparece primero, con el botón del paso que toca.</li>
      <li>Abajo están el detalle de los kits, la dirección y el historial.</li>
      <li>Toca el teléfono del cliente para llamarle si la paquetería lo pide.</li>
    </ul>
    <div class="nota"><p><strong>Consejo:</strong> en el celular, abre <span class="ruta">www.viviendovino.com/admin</span> y agrégalo a tu pantalla de inicio (en Safari: Compartir → "Agregar a pantalla de inicio").</p></div>
  </div>
</div>
""",
    "Celular",
)

pagina(
    f"""
<p class="eti">09 · Inventario</p>
<h2>Tus vinos y sus existencias.</h2>
<p class="lede">En <span class="ruta">Catálogo</span> ves cuántas botellas tienes de cada vino. <strong>Cuando un vino llega a 0, la tienda lo muestra agotado.</strong></p>
{captura("vinos", "Catálogo: tus vinos.")}
{leyenda([
    "<strong>Buscar:</strong> por nombre del vino o del productor.",
    "<strong>Filtros:</strong> ve rápido cuáles tienen pocas botellas o están agotados.",
    "<strong>− y +:</strong> quitan o suman una botella por clic y se guardan solos. Úsalos para ajustes pequeños.",
    "<strong>Pocas / Agotado:</strong> aviso cuando un vino tiene 3 o menos, o 0.",
    "<strong>Ver:</strong> abre la ficha del vino para fijar el número exacto y ver sus movimientos (página 10).",
])}
""",
    "Inventario",
)

pagina(
    f"""
<p class="eti">10 · Inventario</p>
<h2>¿Contaste el almacén? Fija el número exacto.</h2>
<p class="lede">En la ficha de cada vino (botón <strong>Ver</strong>) puedes escribir cuántas botellas tienes de verdad.</p>
{captura("vino-ficha", "Ficha del vino: inventario.")}
{leyenda([
    "<strong>− y +:</strong> igual que en la lista.",
    "<strong>Fijar existencias:</strong> escribe las botellas que contaste, elige el motivo (conteo físico, merma…) y da <strong>Fijar existencias</strong>.",
    "<strong>Movimientos recientes:</strong> cada cambio, quién lo hizo y cuántas quedaron.",
])}
<h3>Lo que el sistema hace solo</h3>
<ul>
  <li><strong>Al pagarse un pedido</strong>, descuenta sus botellas. No las restes a mano.</li>
  <li><strong>Mientras un cliente paga</strong>, aparta las botellas unos minutos; si no paga, regresan.</li>
  <li><strong>Si Viviendo Vino cancela</strong> un pedido, sus botellas regresan solas.</li>
  <li><strong>Te avisa por correo</strong> cuando un vino baja a 3 botellas o menos y cuando llega a 0.</li>
</ul>
<div class="nota"><p><strong>Regla de oro:</strong> si vendes estos vinos por otros canales, actualiza el inventario el mismo día.</p></div>
""",
    "Fijar existencias",
)

pagina(
    f"""
<p class="eti">11 · Finanzas</p>
<h2>Tus ventas y tu saldo.</h2>
<p class="lede">Solo de consulta. Todo está calculado con <strong>tus precios acordados</strong>.</p>
{captura("finanzas", "Finanzas.")}
{leyenda([
    "<strong>Tus ventas:</strong> lo que te toca de todos tus pedidos pagados.",
    "<strong>Entregado:</strong> lo de pedidos ya entregados, es decir, lo que ya se te debe.",
    "<strong>Transferido:</strong> lo que Viviendo Vino ya te pagó.",
    "<strong>Por recibir:</strong> entregado menos transferido. Lo que va en camino se suma al entregarse.",
    "<strong>Transferencias recibidas:</strong> cada pago, con fecha y referencia.",
    "<strong>Ventas por pedido:</strong> el detalle por folio, con su estado.",
])}
<div class="nota ciruela"><p>Recibes tu precio acordado <strong>íntegro</strong>: la comisión de Mercado Pago y los descuentos de campañas salen del margen de Viviendo Vino.</p></div>
""",
    "Finanzas",
)

pagina(
    """
<p class="eti">12 · Ayuda</p>
<h2>Estamos para ayudarte.</h2>
<p class="lede">Ten a la mano el <strong>folio del pedido</strong> (VV-…).</p>
<div class="contacto">
  <div class="card"><p class="eti">Correo</p><p class="dato">hola@viviendovino.com</p></div>
  <div class="card"><p class="eti">Teléfono y WhatsApp</p><p class="dato">229 132 5000</p></div>
  <div class="card"><p class="eti">Horario</p><p class="dato" style="font-size:11pt">Lunes a viernes<br>9:00 a 18:00 (CDMX)</p></div>
</div>
<h3>Resumen en una hoja</h3>
<table><tbody>
  <tr><td style="width:32%"><strong>Entrar</strong></td><td><span class="ruta">www.viviendovino.com/admin</span> · correo, contraseña y código de tu app</td></tr>
  <tr><td><strong>Llega un pedido</strong></td><td>Correo "Nuevo pedido por preparar" → abre el pedido → <strong>Empezar a preparar</strong></td></tr>
  <tr><td><strong>Sale a ruta</strong></td><td>Paquetería + número de guía → <strong>Marcar como enviado</strong></td></tr>
  <tr><td><strong>Llegó</strong></td><td><strong>Marcar como entregado</strong> (entra a tu saldo)</td></tr>
  <tr><td><strong>Cambió tu almacén</strong></td><td>Catálogo → − / + o <strong>Ver → Fijar existencias</strong></td></tr>
  <tr><td><strong>Algo raro</strong></td><td>Nota en el pedido y avísanos. Nunca cambies un vino por otro sin hablarlo.</td></tr>
</tbody></table>
<div class="nota"><p><strong>Seguridad.</strong> Viviendo Vino nunca te pedirá tu contraseña ni tu código por teléfono, correo o WhatsApp.</p></div>
<p style="margin-top:18px;color:var(--gris);font-size:9pt">El abuso en el consumo de este producto es nocivo para la salud. Venta exclusiva a mayores de 18 años.</p>
""",
    "Ayuda",
)

PORTADA = """
<section class="page portada">
  <img class="logo" src="../../public/brand/logo-fondo-oscuro.svg" alt="Viviendo Vino">
  <div class="centro">
    <p class="eti">Manual del aliado · Versión 2</p>
    <h1>Tu panel en<br><em>Viviendo Vino.</em></h1>
    <p class="bajada">Guía visual, paso a paso, para preparar y enviar pedidos, llevar el inventario y consultar tus ventas.</p>
    <p class="bajada" style="font-size:12pt;margin-top:10px"><strong>www.viviendovino.com/admin</strong></p>
  </div>
  <div class="meta"><span>Noviembre 2026</span><span>Uso interno</span><span>Capturas con datos de ejemplo</span></div>
</section>
"""

CSS = (AQUI / "manual.css").read_text()
html = f"""<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><title>Manual del aliado · Viviendo Vino</title>
<style>{CSS}</style></head><body>
{PORTADA}
{''.join(PAGINAS)}
</body></html>"""
(AQUI / "manual-aliado.html").write_text(html)
print("manual-aliado.html:", len(PAGINAS) + 1, "páginas")
