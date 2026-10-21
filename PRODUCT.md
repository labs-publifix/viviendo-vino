# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Adultos mexicanos (18+) que toman vino con curiosidad y quieren aprender, sin solemnidad. Llegan sobre todo desde Instagram (@viviendovino, ~30 mil seguidores) y compran desde el celular. Su trabajo: armar una caja de 6 botellas que les guste, sin miedo a equivocarse y sin sorpresas de envío.

## Product Purpose
Tienda en línea de vino italiano en kits de exactamente 6 botellas armados por el cliente, con envío incluido en el precio. Éxito: el cliente completa su kit, paga de contado y vuelve a comprar.

## Positioning
Resuelve la caja de 6: reglas claras de compatibilidad por grupo de botella, precio con envío incluido desde el primer kit (desde $1,800) y curaduría con voz de entusiasta profesional. Los competidores mexicanos revisados exigen compra mínima para envío gratis y ninguno tiene un armador de cajas de 6.

## Operating Context
- Viviendo Vino es solo canal de venta: el stock y el envío son de un aliado en Córdoba, Veracruz; el aliado factura si el cliente lo pide.
- Cobro con la integración estándar de Mercado Pago en la cuenta de Rafael Aguirre (fase posterior); comisión de 10% del neto.
- Atención por WhatsApp e Instagram.

## Capabilities and Constraints
- Kit de 6 botellas exactas (R1). Solo se mezclan botellas del mismo grupo (azul, rojo, verde, amarillo) (R2). Repetición libre (R3). Precio con envío incluido; el carrito nunca suma envío (R4). Sin meses sin intereses (R5). Solo mayores de 18 (R10).
- El grupo amarillo (Prosecco y Rosé Extra Dry) se propone como caja completa de 6.
- Catálogo inicial: 19 etiquetas italianas, $300 a $1,435 por botella (fuente: catalogo-inicial.json).
- Preparado desde el modelo de datos para varios aliados y botellas sueltas (no se venden en fase 1).
- Fuera de esta fase: pagos, pedidos, correos de pedido, cuentas, panel del aliado, analítica.
- Indefinido: zonas y plazos de entrega, licencia y quién figura como vendedor, leyenda legal definitiva.

## Brand Commitments
- Manual de identidad 2026 (`Viviendo Vino — Manual de identidad 2026.pdf`): es la autoridad de diseño y voz.
- Logotipo intocable; la caligrafía vive solo dentro del logotipo. Archivos en `public/brand/` y kit de favicons en `public/`.
- Voz: tuteo, español de México, dato antes que adjetivo, frases cortas, sin superlativos ni clichés de maridaje; evitar "exclusivo", "selecto", "premium", "el mejor".

## Evidence on Hand
- Catálogo real con precios y descripciones del aliado (texto fuente, se reescribe en voz de marca): `catalogo-inicial.json`.
- No hay fotografías de producto todavía (placeholders). No hay reseñas, testimonios ni premios con concurso/año confirmados: no se inventan.

## Product Principles
1. La regla del kit se entiende sin leer instrucciones: el armador la muestra mientras armas.
2. El precio total con envío incluido se ve desde la primera botella hasta el checkout.
3. Explicar el vino en 5 segundos: un dato y una opinión por etiqueta.
4. Móvil primero: todo se puede hacer con el pulgar.
5. Nunca bloquear la navegación; la mayoría de edad se verifica en el checkout.

## Accessibility & Inclusion
WCAG AA: contraste AA, cuerpo mínimo 16 px, foco visible en carmín, navegación completa por teclado en armador y carrito, respeto de prefers-reduced-motion.
