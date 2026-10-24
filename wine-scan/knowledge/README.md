# Base de conocimiento de Wine Scan — v0.1

Archivos que se cargan en el prompt del sistema del endpoint `/api/wine-scan` (con prompt caching) o se leen desde el repo:

| Archivo | Para qué sirve |
|---|---|
| `grapes.json` | Perfil típico de 56 uvas, sinónimos y un dato corto de cada una |
| `regions.json` | 39 regiones y denominaciones, y qué implican en una etiqueta |
| `label-terms.json` | Términos de etiqueta (DOC, Reserva, Brut, Ripasso…) y falsos amigos |
| `serving.json` | Temperatura, copa y decantación por estilo, con orientación de cuándo tomarlo |
| `pairing-principles.json` | 14 principios de maridaje, cada uno con su porqué |
| `voice.md` | Voz neutra de marca, reglas de honestidad y estructura de la guía |
| `catalog-profiles.json` | Las 19 etiquetas de Viviendo Vino con perfil y nota de cuándo recomendarlas |
| `matching-rules.json` | Regla de similitud y casos de prueba para recomendar un vino del catálogo |

## Escalas (1-5)
- `cuerpo`: 1 ligero · 3 medio · 5 pleno
- `acidez`: 1 suave · 3 media · 5 muy fresca
- `tanino`: 0 sin tanino (blancos, rosados, espumosos) · 1 muy suave · 5 muy marcado
- `dulzor`: 0 seco · 1 seco con fruta madura · 2 semiseco · 3 semidulce · 4 dulce · 5 muy dulce
- `intensidad`: intensidad aromática y de sabor, 1 discreta · 5 muy intensa

## Reglas de uso
1. Estos perfiles son TÍPICOS y estimados. Sirven para interpretar, no para afirmar hechos de una botella concreta.
2. La IA identifica el vino y devuelve un perfil estructurado. El **código** (no la IA) decide si se recomienda un vino del catálogo, con `matching-rules.json`.
3. Los precios y el stock NO se guardan aquí; viven en Supabase, relacionados por `slug`.
4. Cada vino del catálogo tiene `por_confirmar`: revisar con el aliado de Córdoba antes del lanzamiento. Los de `perfil_confianza: "baja"` no se recomiendan (hoy ninguno; Don Carlo y Rosé 921 están en "media" porque su perfil sale solo de la descripción de la tienda). Solo 2 slugs coinciden con los reales de la tienda; alinear los otros 17 con Supabase.
5. Los archivos están versionados en el repo. Los cambios pasan por una revisión de Rafa, porque alimentan todas las respuestas.
