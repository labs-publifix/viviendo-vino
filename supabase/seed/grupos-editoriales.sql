-- Nombres editoriales de los grupos y textos que los mencionan (22 oct 2026). Generado desde data/catalogo-marca.json.
begin;
update public.grupos_botella set nombre = 'La Selezione', descripcion = 'Una selección versátil de 11 etiquetas italianas que reúne vinos blancos, rosados y tintos. Combina y descubre diferentes estilos para encontrar tus favoritos.' where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul';
update public.grupos_botella set nombre = 'I Grandi Rossi', descripcion = 'Cuatro grandes tintos italianos de mayor cuerpo y carácter: Don Carlo, Primitivo di Manduria, Ripasso y Amarone. Elige hasta cuatro etiquetas para crear tu propia colección.' where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'rojo';
update public.grupos_botella set nombre = 'Selezione d’Oro', descripcion = 'Dos tintos de Bodega Rocca, distinguidos con medalla Double Gold. Una selección especial para quienes buscan vinos con reconocimiento y carácter. Combina ambas etiquetas como prefieras.' where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'verde';
update public.grupos_botella set nombre = 'Bollicine', descripcion = 'Una caja completa de seis botellas que combina Prosecco y Rosé Extra Dry. Una selección de vinos espumosos italianos ideal para celebrar, compartir y brindar.' where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'amarillo';
update public.categorias set intro = 'Blancos frescos, con fruta, cítricos y flores, y un rosado ligero. Todos son de La Selezione: se mezclan entre sí y con cuatro tintos.' where slug = 'blancos-rosado';
update public.categorias set intro = 'Tintos de Véneto, Abruzzo, Piamonte y Puglia. En La Selezione, los de todos los días; en I Grandi Rossi, los de más cuerpo; en Selezione d’Oro, los dos de Bodega Rocca.' where slug = 'tintos';
update public.categorias set intro = 'Un Prosecco brut y un rosé extra dry. Burbuja fina, fruta y flores. Van juntos en la caja de 6 de Bollicine.' where slug = 'espumosos';
update public.kits_prearmados set descripcion = 'Cuatro blancos del Véneto y Puglia, de la acidez viva a la fruta madura.' where slug = 'blancos-frescos';
update public.kits_prearmados set descripcion = 'Merlot, Cabernet y Montepulciano: tres tintos de La Selezione para abrir cualquier día.' where slug = 'tintos-de-diario';
update public.kits_prearmados set descripcion = 'La caja de 6 de Bollicine: tres Prosecco y tres Rosé Extra Dry.' where slug = 'burbujas';
commit;
