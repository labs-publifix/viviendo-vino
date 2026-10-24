# Equivalencias de slugs (Wine Scan ↔ tienda)

Cruce de `catalog-profiles.json` con la tabla `productos` de Supabase (fuente: `supabase/seed/catalogo.sql`, la misma que se cargó en la base), por nombre, productor y añada. 24 oct 2026. **Pendiente de confirmación del equipo.**

| Vino en catalog-profiles (nombre · productor · añada) | Slug provisional | Slug real de la tienda | En Supabase (nombre · productor · añada) |
|---|---|---|---|
| Chardonnay IGT Vento · Levorato · 2024 | `chardonnay-igt-vento-levorato-2024` | `chardonnay-vento-igt-2024` | Chardonnay Vento IGT 2024 · Levorato · 2024 |
| Sauvignon Blanc IGT Trevenezie · Levorato · 2024 | `sauvignon-blanc-igt-trevenezie-levorato-2024` | `sauvignon-blanc-trevenezie-igt-2024` | Sauvignon Blanc Trevenezie IGT 2024 · Levorato · 2024 |
| Pinot Grigio delle Venezie DOC · Levorato · 2024 | `pinot-grigio-delle-venezie-doc-levorato-2024` | `pinot-grigio-delle-venezie-doc-2024` | Pinot Grigio delle Venezie DOC 2024 · Levorato · 2024 |
| Traminer Aromatico IGT Trevenezie · Levorato · 2025 | `traminer-aromatico-igt-trevenezie-levorato-2025` | `traminer-aromatico-trevenezie-igt-2025` | Traminer Aromático Trevenezie IGT 2025 · Levorato · 2025 |
| Falanghina IGT Puglia · Levorato · s/a | `falanghina-igt-puglia-levorato` | `falanghina-puglia-igt` | Falanghina Puglia IGT · Levorato · s/a |
| Soave DOC · Levorato · 2024 | `soave-doc-levorato-2024` | `soave-doc-2024` | Soave DOC 2024 · Levorato · 2024 |
| Pinot Grigio 'Blush' Rosado delle Venezie DOC · Levorato · 2025 | `pinot-grigio-blush-rosado-delle-venezie-doc-levorato-2025` | `pinot-grigio-delle-venezie-doc-blush-rosado-2025` | Pinot Grigio delle Venezie DOC Blush (rosado) 2025 · Levorato · 2025 |
| Cabernet Sauvignon IGT Veneto · Levorato · 2024 | `cabernet-sauvignon-igt-veneto-levorato-2024` | `cabernet-sauvignon-veneto-igt-2024` | Cabernet Sauvignon Veneto IGT 2024 · Levorato · 2024 |
| Merlot IGT Veneto · Levorato · 2024 | `merlot-igt-veneto-levorato-2024` | `merlot-veneto-igt-2024` | Merlot Veneto IGT 2024 · Levorato · 2024 |
| Montepulciano d'Abruzzo DOC · Levorato · 2024 | `montepulciano-dabruzzo-doc-levorato-2024` | `montepulciano-d-abruzzo-doc-2024` | Montepulciano d''Abruzzo DOC 2024 · Levorato · 2024 |
| Langhe Nebbiolo · Bertino Fiorella · s/a | `langhe-nebbiolo-bertino-fiorella` | `langhe-nebbiolo` | Langhe Nebbiolo · Fiorella Bertino · s/a |
| Rosso IGT Veneto 'Don Carlo' · Levorato · 2018 | `don-carlo-rosso-veneto-igt-2018` | `don-carlo-rosso-veneto-igt-2018` | Don Carlo Rosso Veneto IGT 2018 · Levorato · 2018 |
| Primitivo di Manduria DOC 'Villa Fulvia' · Levorato · 2023 | `primitivo-di-manduria-doc-villa-fulvia-levorato-2023` | `primitivo-di-manduria-doc-2023` | Primitivo di Manduria DOC 2023 · Villa Fulvia (Levorato) · 2023 |
| Valpolicella Ripasso Classico Superiore DOC · Levorato · 2020 | `valpolicella-ripasso-classico-superiore-doc-levorato-2020` | `valpolicella-ripasso-classico-superiore-doc-2020` | Valpolicella Ripasso Classico Superiore DOC 2020 · Levorato · 2020 |
| Amarone della Valpolicella Classico DOCG · Levorato · 2017 | `amarone-della-valpolicella-classico-docg-levorato-2017` | `amarone-della-valpolicella-classico-docg-2017` | Amarone della Valpolicella Classico DOCG 2017 · Levorato · 2017 |
| Sangiovese IGT Puglia · Bodega Rocca · 2024 | `sangiovese-igt-puglia-bodega-rocca-2024` | `sangiovese-puglia-igt-2024-double-gold` | Sangiovese Puglia IGT 2024 (Double Gold) · Bodega Rocca · 2024 |
| Primitivo · Bodega Rocca · 2025 | `primitivo-igt-rocca-2025` | `primitivo-2025-double-gold` | Primitivo 2025 (Double Gold) · Rocca · 2025 |
| Prosecco DOC Spumante Brut 'Imperial' · Carlov · s/a | `prosecco-doc-spumante-brut-carlov-imperial` | `prosecco-doc-spumante-brut-imperial` | Prosecco DOC Spumante Brut Imperial · Carlov / Carlos V · s/a |
| Rosé Extra Dry 921 · Collevento · s/a | `rose-extra-dry-921` | `rose-extra-dry-921` | Rosé Extra Dry 921 · Collevento · s/a |

Los 19 vinos existen en Supabase. Ninguno quedó sin pareja, así que ninguno se excluye por esta razón; la recomendación además revisa en cada escaneo que el vino siga activo y disponible.

Diferencias de datos a confirmar (no cambian el cruce):

- Prosecco: el perfil dice productor "Carlov"; la tienda dice "Carlov / Carlos V".
- Langhe Nebbiolo: el perfil dice "Bertino Fiorella"; la tienda, "Fiorella Bertino".
- Primitivo di Manduria: la tienda lo atribuye a "Villa Fulvia (Levorato)".
- Sangiovese y Primitivo de Bodega Rocca: la tienda los publica con "Double Gold" en el nombre; el perfil pide no mencionar el premio hasta confirmar concurso y año. Wine Scan no lo menciona.
