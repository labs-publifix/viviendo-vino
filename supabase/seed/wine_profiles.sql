-- Generado por scripts/build-quiz-seed.mjs. No editar a mano: cambia catalog-profiles.json o quiz/config/vinos.json
-- y vuelve a generar. Corre después de supabase/migrations/20261026000000_quiz.sql.
begin;

insert into public.wine_profiles (slug, nombre, lista, grupo, cuerpo, acidez, tanino, dulzor, intensidad, familias_aromaticas, ocasiones, platos, rol_kit, perfil_confianza) values
  ('chardonnay-vento-igt-2024', 'Chardonnay IGT Vento', 1, 'blanco', 3, 3, 0, 1, 3, array['fruta_hueso', 'citricos_hierbas']::text[], array['diario', 'amigos', 'pareja']::text[], array['aves_cerdo', 'pescados_mariscos', 'pastas_pizza']::text[], 'basico', 'alta'),
  ('sauvignon-blanc-trevenezie-igt-2024', 'Sauvignon Blanc IGT Trevenezie', 1, 'blanco', 2, 4, 0, 1, 4, array['citricos_hierbas']::text[], array['diario', 'amigos']::text[], array['pescados_mariscos', 'vegetariano', 'quesos_botanas']::text[], 'basico', 'alta'),
  ('pinot-grigio-delle-venezie-doc-2024', 'Pinot Grigio delle Venezie DOC', 1, 'blanco', 2, 3, 0, 1, 2, array['fruta_hueso', 'citricos_hierbas']::text[], array['diario', 'amigos']::text[], array['pescados_mariscos', 'vegetariano', 'quesos_botanas']::text[], 'basico', 'alta'),
  ('traminer-aromatico-trevenezie-igt-2025', 'Traminer Aromatico IGT Trevenezie', 1, 'blanco', 3, 3, 0, 2, 5, array['flores', 'fruta_hueso']::text[], array['explorar', 'pareja', 'regalo']::text[], array['picante', 'quesos_botanas', 'aves_cerdo']::text[], 'descubrimiento', 'alta'),
  ('falanghina-puglia-igt', 'Falanghina IGT Puglia', 1, 'blanco', 3, 3, 0, 1, 3, array['fruta_hueso', 'citricos_hierbas']::text[], array['explorar', 'diario']::text[], array['pescados_mariscos', 'pastas_pizza', 'vegetariano']::text[], 'descubrimiento', 'alta'),
  ('soave-doc-2024', 'Soave DOC', 1, 'blanco', 2, 3, 0, 1, 2, array['flores', 'fruta_hueso']::text[], array['diario', 'amigos']::text[], array['pescados_mariscos', 'vegetariano', 'pastas_pizza']::text[], 'basico', 'alta'),
  ('pinot-grigio-delle-venezie-doc-blush-rosado-2025', 'Pinot Grigio ''Blush'' Rosado delle Venezie DOC', 1, 'rosado', 2, 3, 0, 1, 2, array['frutas_rojas', 'flores']::text[], array['amigos', 'diario', 'pareja']::text[], array['quesos_botanas', 'pescados_mariscos', 'picante']::text[], 'basico', 'alta'),
  ('cabernet-sauvignon-veneto-igt-2024', 'Cabernet Sauvignon IGT Veneto', 2, 'tinto', 4, 3, 4, 1, 4, array['frutas_rojas', 'especias_chocolate']::text[], array['diario', 'amigos']::text[], array['carnes_rojas', 'quesos_botanas']::text[], 'basico', 'alta'),
  ('merlot-veneto-igt-2024', 'Merlot IGT Veneto', 2, 'tinto', 3, 3, 3, 1, 3, array['frutas_rojas']::text[], array['diario', 'amigos', 'pareja']::text[], array['pastas_pizza', 'aves_cerdo', 'carnes_rojas']::text[], 'basico', 'alta'),
  ('montepulciano-d-abruzzo-doc-2024', 'Montepulciano d''Abruzzo DOC', 2, 'tinto', 4, 3, 3, 1, 3, array['frutas_rojas', 'especias_chocolate']::text[], array['diario', 'amigos']::text[], array['pastas_pizza', 'carnes_rojas', 'quesos_botanas']::text[], 'basico', 'alta'),
  ('langhe-nebbiolo', 'Langhe Nebbiolo', 2, 'tinto', 3, 5, 4, 1, 4, array['flores', 'frutas_rojas']::text[], array['pareja', 'explorar', 'regalo']::text[], array['carnes_rojas', 'pastas_pizza', 'quesos_botanas']::text[], 'descubrimiento', 'alta'),
  ('don-carlo-rosso-veneto-igt-2018', 'Rosso IGT Veneto ''Don Carlo''', 2, 'tinto', 3, 3, 3, 1, 3, array['frutas_rojas', 'especias_chocolate']::text[], array['regalo', 'pareja']::text[], array['carnes_rojas', 'pastas_pizza', 'quesos_botanas']::text[], 'especial', 'media'),
  ('primitivo-di-manduria-doc-2023', 'Primitivo di Manduria DOC ''Villa Fulvia''', 2, 'tinto', 5, 2, 3, 2, 5, array['especias_chocolate', 'frutas_rojas']::text[], array['amigos', 'regalo', 'explorar']::text[], array['carnes_rojas', 'picante', 'quesos_botanas']::text[], 'descubrimiento', 'alta'),
  ('valpolicella-ripasso-classico-superiore-doc-2020', 'Valpolicella Ripasso Classico Superiore DOC', 2, 'tinto', 4, 4, 3, 1, 4, array['frutas_rojas', 'especias_chocolate']::text[], array['pareja', 'regalo']::text[], array['carnes_rojas', 'pastas_pizza', 'quesos_botanas']::text[], 'especial', 'alta'),
  ('amarone-della-valpolicella-classico-docg-2017', 'Amarone della Valpolicella Classico DOCG', 2, 'tinto', 5, 3, 4, 2, 5, array['especias_chocolate', 'frutas_rojas']::text[], array['regalo', 'pareja']::text[], array['carnes_rojas', 'quesos_botanas']::text[], 'especial', 'alta'),
  ('sangiovese-puglia-igt-2024-double-gold', 'Sangiovese IGT Puglia', 3, 'tinto', 3, 3, 3, 1, 3, array['frutas_rojas', 'citricos_hierbas']::text[], array['diario', 'amigos']::text[], array['pastas_pizza', 'aves_cerdo', 'quesos_botanas']::text[], 'descubrimiento', 'alta'),
  ('primitivo-2025-double-gold', 'Primitivo', 3, 'tinto', 4, 2, 3, 2, 4, array['frutas_rojas', 'especias_chocolate']::text[], array['amigos', 'explorar']::text[], array['carnes_rojas', 'picante', 'pastas_pizza']::text[], 'descubrimiento', 'alta'),
  ('prosecco-doc-spumante-brut-imperial', 'Prosecco DOC Spumante Brut ''Imperial''', 4, 'espumoso', 2, 4, 0, 2, 2, array['fruta_hueso', 'citricos_hierbas', 'flores']::text[], array['amigos', 'diario', 'regalo']::text[], array['quesos_botanas', 'pescados_mariscos', 'picante']::text[], 'basico', 'alta'),
  ('rose-extra-dry-921', 'Rosé Extra Dry 921', 4, 'espumoso', 2, 3, 0, 3, 3, array['frutas_rojas', 'flores']::text[], array['pareja', 'amigos', 'regalo']::text[], array['quesos_botanas', 'postres', 'picante']::text[], 'descubrimiento', 'media')
on conflict (slug) do update set nombre = excluded.nombre, lista = excluded.lista, grupo = excluded.grupo, cuerpo = excluded.cuerpo,
  acidez = excluded.acidez, tanino = excluded.tanino, dulzor = excluded.dulzor, intensidad = excluded.intensidad,
  familias_aromaticas = excluded.familias_aromaticas, ocasiones = excluded.ocasiones, platos = excluded.platos,
  rol_kit = excluded.rol_kit, perfil_confianza = excluded.perfil_confianza, updated_at = now();

-- Revisión: perfiles sin producto en la tienda (debe salir vacío).
-- select w.slug from public.wine_profiles w left join public.productos p on p.slug = w.slug where p.slug is null;

commit;
