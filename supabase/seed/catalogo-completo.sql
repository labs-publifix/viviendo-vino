-- Tablas del catálogo + carga de las 19 etiquetas. Generado por scripts/build-seed.mjs.

-- Catálogo de la tienda (Fundamentos §1.1, §3, §12).
-- Todo pertenece a un aliado (multi-aliado desde el día uno) y cada producto declara su modo de venta
-- (solo kit hoy; botellas sueltas preparadas). Lectura pública solo de lo activo; sin escritura pública.

-- Aliados ---------------------------------------------------------------------------------------------
create table if not exists public.aliados (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  ciudad text,
  estado text,
  comision_bps integer not null default 1000 check (comision_bps between 0 and 10000), -- 1000 = 10%
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Configuración comercial por aliado (M-02). La política de envío decide si el envío va incluido.
create table if not exists public.configuracion_comercial (
  aliado_id uuid primary key references public.aliados (id) on delete cascade,
  envio_incluido boolean not null default true,
  tamano_kit integer not null default 6 check (tamano_kit > 0),
  plazo_preparacion_dias integer,
  plazo_entrega_texto text,
  textos_legales jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Reglas de envío para cuando se vendan botellas sueltas (M-06, M-07). Vacía en la fase 1.
create table if not exists public.reglas_envio (
  id uuid primary key default gen_random_uuid(),
  aliado_id uuid not null references public.aliados (id) on delete cascade,
  zona text,
  costo_centavos integer check (costo_centavos >= 0),
  umbral_envio_gratis_centavos integer check (umbral_envio_gratis_centavos >= 0),
  umbral_envio_gratis_botellas integer check (umbral_envio_gratis_botellas >= 0),
  activo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Grupos de compatibilidad (R2): solo se mezclan botellas del mismo grupo. Son de cada aliado.
create table if not exists public.grupos_botella (
  id uuid primary key default gen_random_uuid(),
  aliado_id uuid not null references public.aliados (id) on delete cascade,
  codigo text not null,
  nombre text not null,
  descripcion text,
  solo_caja_completa boolean not null default false, -- amarillo: se propone como caja de 6 lista
  orden integer not null default 0,
  unique (aliado_id, codigo)
);

-- Categorías del catálogo, con su introducción en voz de marca y el texto fuente del aliado.
create table if not exists public.categorias (
  slug text primary key,
  nombre text not null,
  intro text,
  intro_aliado text,
  orden integer not null default 0
);

-- Productos ---------------------------------------------------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  aliado_id uuid not null references public.aliados (id),
  slug text not null unique,
  nombre_oficial text not null,
  nombre_comercial text,
  productor text not null,
  categoria_slug text not null references public.categorias (slug),
  grupo_id uuid not null references public.grupos_botella (id),
  tipo text not null check (tipo in ('blanco', 'rosado', 'tinto', 'espumoso')),
  uva text,
  region text,
  denominacion text,
  anada integer check (anada between 1900 and 2100),
  volumen_ml integer not null default 750 check (volumen_ml > 0),
  grado_alcohol numeric(4, 1),
  precio_centavos integer not null check (precio_centavos > 0), -- precio al público con envío incluido
  premio text,
  descripcion text not null,           -- voz de marca (lo que ve el cliente)
  descripcion_aliado text,             -- texto fuente del aliado, sin publicar
  imagen_url text,                     -- vacío: la tienda muestra el placeholder
  modo_venta text not null default 'kit' check (modo_venta in ('kit', 'suelta', 'ambos')),
  disponible boolean not null default true, -- stock por etiqueta (C-08); el aliado lo marca
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists productos_grupo_idx on public.productos (grupo_id);
create index if not exists productos_categoria_idx on public.productos (categoria_slug);

-- Un producto solo puede estar en un grupo de su mismo aliado.
create or replace function public.productos_grupo_mismo_aliado() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.grupos_botella g where g.id = new.grupo_id and g.aliado_id = new.aliado_id) then
    raise exception 'El grupo % no pertenece al aliado del producto', new.grupo_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists productos_grupo_mismo_aliado on public.productos;
create trigger productos_grupo_mismo_aliado before insert or update on public.productos
  for each row execute function public.productos_grupo_mismo_aliado();

-- Kits prearmados (C-10) --------------------------------------------------------------------------------
create table if not exists public.kits_prearmados (
  id uuid primary key default gen_random_uuid(),
  aliado_id uuid not null references public.aliados (id),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  orden integer not null default 0
);
create table if not exists public.kits_prearmados_items (
  kit_id uuid not null references public.kits_prearmados (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad integer not null check (cantidad between 1 and 6),
  primary key (kit_id, producto_id)
);

-- La base rechaza un kit que no sea de 6 botellas del mismo grupo (Fundamentos §12).
-- Se valida al confirmar la transacción, para poder insertar los renglones uno por uno.
create or replace function public.validar_kit_prearmado() returns trigger
language plpgsql as $$
declare
  k uuid := coalesce(new.kit_id, old.kit_id);
  total integer;
  grupos integer;
begin
  if not exists (select 1 from public.kits_prearmados where id = k) then
    return null; -- el kit se borró completo
  end if;
  select coalesce(sum(i.cantidad), 0), count(distinct p.grupo_id)
    into total, grupos
    from public.kits_prearmados_items i join public.productos p on p.id = i.producto_id
    where i.kit_id = k;
  if total <> 6 or grupos > 1 then
    raise exception 'El kit % debe tener 6 botellas del mismo grupo (tiene %, de % grupos)', k, total, grupos;
  end if;
  return null;
end $$;
drop trigger if exists validar_kit_prearmado on public.kits_prearmados_items;
create constraint trigger validar_kit_prearmado after insert or update or delete on public.kits_prearmados_items
  deferrable initially deferred for each row execute function public.validar_kit_prearmado();

-- Seguridad: RLS en todo; lectura pública solo de lo activo; ninguna escritura pública ----------------
alter table public.aliados enable row level security;
alter table public.configuracion_comercial enable row level security;
alter table public.reglas_envio enable row level security;
alter table public.grupos_botella enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.kits_prearmados enable row level security;
alter table public.kits_prearmados_items enable row level security;

revoke all on public.aliados, public.configuracion_comercial, public.reglas_envio, public.grupos_botella,
  public.categorias, public.productos, public.kits_prearmados, public.kits_prearmados_items
  from anon, authenticated;
grant select on public.aliados, public.grupos_botella, public.categorias,
  public.kits_prearmados, public.kits_prearmados_items to anon, authenticated;
-- Productos: permiso por columna. descripcion_aliado (texto fuente interno) queda fuera.
grant select (id, aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo,
  uva, region, denominacion, anada, volumen_ml, grado_alcohol, precio_centavos, premio, descripcion, imagen_url,
  modo_venta, disponible, activo, orden) on public.productos to anon, authenticated;

drop policy if exists "aliados activos" on public.aliados;
create policy "aliados activos" on public.aliados for select to anon, authenticated using (activo);

drop policy if exists "grupos de aliados activos" on public.grupos_botella;
create policy "grupos de aliados activos" on public.grupos_botella for select to anon, authenticated
  using (exists (select 1 from public.aliados a where a.id = aliado_id and a.activo));

drop policy if exists "categorias publicas" on public.categorias;
create policy "categorias publicas" on public.categorias for select to anon, authenticated using (true);

drop policy if exists "productos activos" on public.productos;
create policy "productos activos" on public.productos for select to anon, authenticated using (activo);

drop policy if exists "kits activos" on public.kits_prearmados;
create policy "kits activos" on public.kits_prearmados for select to anon, authenticated using (activo);

drop policy if exists "items de kits activos" on public.kits_prearmados_items;
create policy "items de kits activos" on public.kits_prearmados_items for select to anon, authenticated
  using (exists (select 1 from public.kits_prearmados k where k.id = kit_id and k.activo));

-- Generado por scripts/build-seed.mjs. No editar a mano: cambia los JSON de data/ y vuelve a generar.
-- Precios: data/catalogo-inicial.json (únicos válidos, con envío incluido).
begin;

insert into public.aliados (slug, nombre, ciudad, estado, comision_bps) values
  ('aliado-cordoba', 'Aliado de Córdoba', 'Córdoba', 'Veracruz', 1000)
on conflict (slug) do update set nombre = excluded.nombre, ciudad = excluded.ciudad, estado = excluded.estado, comision_bps = excluded.comision_bps;

insert into public.configuracion_comercial (aliado_id, envio_incluido, tamano_kit) select id, true, 6 from public.aliados where slug = 'aliado-cordoba'
on conflict (aliado_id) do nothing;

insert into public.grupos_botella (aliado_id, codigo, nombre, descripcion, solo_caja_completa, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'azul', 'La Selezione', 'Una selección versátil de 11 etiquetas italianas que reúne vinos blancos, rosados y tintos. Combina y descubre diferentes estilos para encontrar tus favoritos.', false, 1)
on conflict (aliado_id, codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, solo_caja_completa = excluded.solo_caja_completa, orden = excluded.orden;
insert into public.grupos_botella (aliado_id, codigo, nombre, descripcion, solo_caja_completa, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'rojo', 'I Grandi Rossi', 'Cuatro grandes tintos italianos de mayor cuerpo y carácter: Don Carlo, Primitivo di Manduria, Ripasso y Amarone. Elige hasta cuatro etiquetas para crear tu propia colección.', false, 2)
on conflict (aliado_id, codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, solo_caja_completa = excluded.solo_caja_completa, orden = excluded.orden;
insert into public.grupos_botella (aliado_id, codigo, nombre, descripcion, solo_caja_completa, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'verde', 'Selezione d’Oro', 'Dos tintos de Bodega Rocca, distinguidos con medalla Double Gold. Una selección especial para quienes buscan vinos con reconocimiento y carácter. Combina ambas etiquetas como prefieras.', false, 3)
on conflict (aliado_id, codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, solo_caja_completa = excluded.solo_caja_completa, orden = excluded.orden;
insert into public.grupos_botella (aliado_id, codigo, nombre, descripcion, solo_caja_completa, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'amarillo', 'Bollicine', 'Una caja completa de seis botellas que combina Prosecco y Rosé Extra Dry. Una selección de vinos espumosos italianos ideal para celebrar, compartir y brindar.', true, 4)
on conflict (aliado_id, codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, solo_caja_completa = excluded.solo_caja_completa, orden = excluded.orden;

insert into public.categorias (slug, nombre, intro, intro_aliado, orden) values ('blancos-rosado', 'Blancos y rosado', 'Blancos frescos, con fruta, cítricos y flores, y un rosado ligero. Todos son de La Selezione: se mezclan entre sí y con cuatro tintos.', 'Vino blanco fresco y elegante, con aromas frutales y final suave y armonioso; aromas frescos, notas cítricas y matices florales. Rosado: fresco y sofisticado, notas frutales y florales, equilibrio entre frescura y suavidad.', 1)
on conflict (slug) do update set nombre = excluded.nombre, intro = excluded.intro, intro_aliado = excluded.intro_aliado, orden = excluded.orden;
insert into public.categorias (slug, nombre, intro, intro_aliado, orden) values ('tintos', 'Tintos', 'Tintos de Véneto, Abruzzo, Piamonte y Puglia. En La Selezione, los de todos los días; en I Grandi Rossi, los de más cuerpo; en Selezione d’Oro, los dos de Bodega Rocca.', 'Selección de tintos elegidos por su carácter, sofisticación y tradición; cada etiqueta refleja la esencia de las mejores regiones vinícolas, con aromas intensos, notas afrutadas y una experiencia refinada.', 2)
on conflict (slug) do update set nombre = excluded.nombre, intro = excluded.intro, intro_aliado = excluded.intro_aliado, orden = excluded.orden;
insert into public.categorias (slug, nombre, intro, intro_aliado, orden) values ('espumosos', 'Espumosos', 'Un Prosecco brut y un rosé extra dry. Burbuja fina, fruta y flores. Van juntos en la caja de 6 de Bollicine.', 'Espumoso de gran frescura y sofisticación, finas burbujas y delicadas notas frutales y florales; ligero y elegante, para celebrar momentos especiales.', 3)
on conflict (slug) do update set nombre = excluded.nombre, intro = excluded.intro, intro_aliado = excluded.intro_aliado, orden = excluded.orden;

insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'chardonnay-vento-igt-2024', 'Chardonnay Vento IGT 2024', 'Chardonnay Levorato Veneto', 'Levorato', 'blancos-rosado', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'blanco', 'Chardonnay', 'Véneto', 'IGT', 2024, 30000, null, 'Chardonnay del Véneto, de cuerpo medio. Pera madura, manzana y un toque cítrico; acidez equilibrada y un final ligeramente mineral.', 'Cuerpo medio y suave; pera madura, manzana y toque cítrico; acidez equilibrada y ligero matiz mineral.', '/img/vinos/chardonnay-vento-igt-2024.webp', 'kit', 1)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'sauvignon-blanc-trevenezie-igt-2024', 'Sauvignon Blanc Trevenezie IGT 2024', 'Sauvignon Blanc Levorato', 'Levorato', 'blancos-rosado', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'blanco', 'Sauvignon Blanc', 'Tre Venezie', 'IGT', 2024, 31000, null, 'Fresco y vibrante. Manzana verde, ralladura de cítricos y una nota herbal sutil. La acidez manda.', 'Fresco y vibrante; manzana verde, ralladura de cítricos y sutil toque herbal; acidez refrescante.', '/img/vinos/sauvignon-blanc-trevenezie-igt-2024.webp', 'kit', 2)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'pinot-grigio-delle-venezie-doc-2024', 'Pinot Grigio delle Venezie DOC 2024', 'Pinot Grigio delle Venezie DOC', 'Levorato', 'blancos-rosado', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'blanco', 'Pinot Grigio', 'Delle Venezie', 'DOC', 2024, 31500, null, 'Delicado y fresco. Manzana verde, pera y durazno blanco, con flores de acacia y jazmín y un toque de limón y lima.', 'Fresco y delicado; manzana verde, pera y melocotón blanco; notas florales de acacia y jazmín y toque cítrico de limón y lima.', '/img/vinos/pinot-grigio-delle-venezie-doc-2024.webp', 'kit', 3)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'traminer-aromatico-trevenezie-igt-2025', 'Traminer Aromático Trevenezie IGT 2025', 'Traminer Aromático Levorato', 'Levorato', 'blancos-rosado', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'blanco', 'Traminer Aromático', 'Tre Venezie', 'IGT', 2025, 30000, null, 'Huélelo primero: lichi y agua de rosas. Luego, fruta de hueso madura, durazno y chabacano. Rico y aromático.', 'Rico y aromático; lichi, agua de rosas y frutas de hueso maduras como melocotón y albaricoque.', '/img/vinos/traminer-aromatico-trevenezie-igt-2025.webp', 'kit', 4)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'falanghina-puglia-igt', 'Falanghina Puglia IGT', 'Falanghina Levorato', 'Levorato', 'blancos-rosado', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'blanco', 'Falanghina', 'Puglia', 'IGT', null, 32000, null, 'Falanghina, blanca del sur de Italia. Cuerpo ligero a medio, cítricos vivos, manzana verde crujiente y un toque de pera.', 'Cuerpo ligero a medio; cítricos vibrantes, manzana verde crujiente y toque de pera.', '/img/vinos/falanghina-puglia-igt.webp', 'kit', 5)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'soave-doc-2024', 'Soave DOC 2024', 'Soave Levorato DOC', 'Levorato', 'blancos-rosado', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'blanco', null, 'Véneto', 'DOC', 2024, 30000, null, 'Soave, del Véneto. Ligero y refrescante: limón, manzana verde y durazno blanco, con acidez viva.', 'Ligero y refrescante; limón, manzana verde y melocotón blanco; acidez viva y equilibrada.', '/img/vinos/soave-doc-2024.webp', 'kit', 6)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'pinot-grigio-delle-venezie-doc-blush-rosado-2025', 'Pinot Grigio delle Venezie DOC Blush (rosado) 2025', 'Pinot grigio blush delle Venezie DOC', 'Levorato', 'blancos-rosado', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'rosado', 'Pinot Grigio', 'Delle Venezie', 'DOC', 2025, 31000, null, 'Rosado de Pinot Grigio. Frutos rojos frescos, cítricos y un toque de durazno blanco. Ligero, con acidez que refresca.', 'Fresco y ligero; frutos rojos frescos, cítricos y delicado toque de melocotón blanco; acidez refrescante.', '/img/vinos/pinot-grigio-delle-venezie-doc-blush-rosado-2025.webp', 'kit', 7)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'cabernet-sauvignon-veneto-igt-2024', 'Cabernet Sauvignon Veneto IGT 2024', 'Cabernet Souvignon Levorato', 'Levorato', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'tinto', 'Cabernet Sauvignon', 'Véneto', 'IGT', 2024, 31000, null, 'Cassis, zarzamora y especias. Tanino firme, con chocolate y hierbas al final.', 'Aromas intensos de cassis, mora y especias; paladar estructurado con taninos firmes y notas de chocolate y hierbas.', '/img/vinos/cabernet-sauvignon-veneto-igt-2024.webp', 'kit', 8)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'merlot-veneto-igt-2024', 'Merlot Veneto IGT 2024', 'Merlot Levorato', 'Levorato', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'tinto', 'Merlot', 'Véneto', 'IGT', 2024, 30000, null, 'Suave, de cuerpo medio. Frutos rojos maduros, sobre todo bayas, con pimienta y vainilla.', 'Suave, de cuerpo medio; frutos rojos maduros, especialmente bayas, con pimienta y vainilla.', '/img/vinos/merlot-veneto-igt-2024.webp', 'kit', 9)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'montepulciano-d-abruzzo-doc-2024', 'Montepulciano d''Abruzzo DOC 2024', 'Montepulciano d''Abruzzo DOC Levorato', 'Levorato', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'tinto', 'Montepulciano', 'Abruzzo', 'DOC', 2024, 30000, null, 'Montepulciano de Abruzzo: cuerpo pleno y buena estructura. Cereza y zarzamora, regaliz y especias.', 'Cuerpo pleno y bien estructurado; cereza y mora, regaliz y especias.', '/img/vinos/montepulciano-d-abruzzo-doc-2024.webp', 'kit', 10)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'langhe-nebbiolo', 'Langhe Nebbiolo', 'Nebbiolo Langhe DOC Fiorella Bertino', 'Fiorella Bertino', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'azul'), 'tinto', 'Nebbiolo', 'Piamonte', 'DOC', null, 40500, null, 'Nebbiolo de Langhe, en el Piamonte, de la bodega Fiorella Bertino. Pronto agregamos su nota de cata.', 'SIN NOTA DE CATA en el PDF (solo filosofía de Cantina Bertino); pedir ficha al aliado.', '/img/vinos/langhe-nebbiolo.webp', 'kit', 11)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'don-carlo-rosso-veneto-igt-2018', 'Don Carlo Rosso Veneto IGT 2018', 'Levorato Don Carlo Veneto', 'Levorato', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'rojo'), 'tinto', null, 'Véneto', 'IGT', 2018, 54500, null, 'Tinto del Véneto, cosecha 2018. Cuerpo medio y armonioso: frutos rojos y negros maduros, especias sutiles y un toque terroso.', 'Cuerpo medio y armonioso; frutos rojos y negros maduros, especias sutiles y toque terroso.', '/img/vinos/don-carlo-rosso-veneto-igt-2018.webp', 'kit', 12)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'primitivo-di-manduria-doc-2023', 'Primitivo di Manduria DOC 2023', 'Primitivo Manduria DOC Villa Fulvia', 'Villa Fulvia (Levorato)', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'rojo'), 'tinto', 'Primitivo', 'Puglia', 'DOC', 2023, 60000, null, 'Primitivo de Manduria, en Puglia. Frutos negros maduros, mermelada de ciruela, pimienta negra y cuero. Rico, suave y bien estructurado.', 'Rico, suave y bien estructurado; frutos negros maduros, mermelada y ciruela, pimienta negra y cuero.', '/img/vinos/primitivo-di-manduria-doc-2023.webp', 'kit', 13)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'valpolicella-ripasso-classico-superiore-doc-2020', 'Valpolicella Ripasso Classico Superiore DOC 2020', 'Valpolicella ripasso superiore Doc Levorato', 'Levorato', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'rojo'), 'tinto', null, 'Véneto', 'DOC', 2020, 67000, null, 'Ripasso: el vino vuelve a pasar sobre los orujos del Amarone. Por eso es intenso, de cuerpo completo, con pimienta negra, pasas y cereza dulce.', 'Perfumes picantes y pimienta negra con toque de pasas; equilibrado, de cuerpo completo, muy intenso y picante, con cereza dulce.', '/img/vinos/valpolicella-ripasso-classico-superiore-doc-2020.webp', 'kit', 14)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'amarone-della-valpolicella-classico-docg-2017', 'Amarone della Valpolicella Classico DOCG 2017', 'Amarone della Valpolicella Doc Levorato', 'Levorato', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'rojo'), 'tinto', null, 'Véneto', 'DOCG', 2017, 143500, null, 'Amarone: se hace con uvas secadas antes de fermentar. Complejo e intenso, con miel de acacia, zarzamora, cereza, especias oscuras y café.', 'Complejo e intenso; miel de acacia, mora y cereza Vignola, con especias oscuras, pimienta negra y café.', '/img/vinos/amarone-della-valpolicella-classico-docg-2017.webp', 'kit', 15)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'sangiovese-puglia-igt-2024-double-gold', 'Sangiovese Puglia IGT 2024 (Double Gold)', 'Sangiovese Primitivo Puglia (asignación inferida)', 'Bodega Rocca', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'verde'), 'tinto', 'Sangiovese', 'Puglia', 'IGT', 2024, 35000, 'Double Gold', 'Sangiovese de Puglia. Rojo intenso, violeta y frutos rojos maduros. Redondo y fino, con acidez equilibrada y buena estructura.', 'Color rojo intenso; aroma complejo de violeta y frutos rojos maduros; redondo, fino y armonioso, con acidez equilibrada y buena estructura.', '/img/vinos/sangiovese-puglia-igt-2024-double-gold.webp', 'kit', 16)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'primitivo-2025-double-gold', 'Primitivo 2025 (Double Gold)', 'Primitivo Salento (asignación inferida)', 'Rocca', 'tintos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'verde'), 'tinto', 'Primitivo', 'Puglia', null, 2025, 35200, 'Double Gold', 'Primitivo de Bodega Rocca. Rojo rubí, ciruela madura, confitura de cereza y cacao.', 'Rojo rubí muy elegante; aromas intensos de ciruelas maduras, confituras de cereza y cacao.', '/img/vinos/primitivo-2025-double-gold.webp', 'kit', 17)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'prosecco-doc-spumante-brut-imperial', 'Prosecco DOC Spumante Brut Imperial', 'Prosecco Imperial Carlos V DOC', 'Carlov / Carlos V', 'espumosos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'amarillo'), 'espumoso', 'Glera', null, 'DOC', null, 49500, null, 'Prosecco brut. Burbuja fina y persistente; flores blancas, pera, manzana y un toque cítrico. Vibrante, pero suave en boca.', 'Color pajizo pálido con burbujas suaves y persistentes; flores blancas, pera, manzana y toque cítrico; vibrante pero suave en boca.', '/img/vinos/prosecco-doc-spumante-brut-imperial.webp', 'kit', 18)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;
insert into public.productos (aliado_id, slug, nombre_oficial, nombre_comercial, productor, categoria_slug, grupo_id, tipo, uva, region, denominacion, anada, precio_centavos, premio, descripcion, descripcion_aliado, imagen_url, modo_venta, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'rose-extra-dry-921', 'Rosé Extra Dry 921', '921 Rose Collevento', 'Collevento', 'espumosos', (select id from public.grupos_botella where aliado_id = (select id from public.aliados where slug = 'aliado-cordoba') and codigo = 'amarillo'), 'espumoso', null, null, null, null, 46500, null, 'Espumoso rosado extra dry, de baja graduación. Rosa y frutos rojos en nariz; suave, fácil de beber y con final limpio.', 'Nariz inmediata y fresca de rosa y frutos rojos; suave e inmediato en boca, baja graduación alcohólica y gran bebibilidad; final neto que deja la boca limpia.', '/img/vinos/rose-extra-dry-921.webp', 'kit', 19)
on conflict (slug) do update set aliado_id = excluded.aliado_id, nombre_oficial = excluded.nombre_oficial, nombre_comercial = excluded.nombre_comercial, productor = excluded.productor, categoria_slug = excluded.categoria_slug, grupo_id = excluded.grupo_id, tipo = excluded.tipo, uva = excluded.uva, region = excluded.region, denominacion = excluded.denominacion, anada = excluded.anada, precio_centavos = excluded.precio_centavos, premio = excluded.premio, descripcion = excluded.descripcion, descripcion_aliado = excluded.descripcion_aliado, imagen_url = excluded.imagen_url, modo_venta = excluded.modo_venta, orden = excluded.orden;

insert into public.kits_prearmados (aliado_id, slug, nombre, descripcion, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'blancos-frescos', 'Blancos frescos', 'Cuatro blancos del Véneto y Puglia, de la acidez viva a la fruta madura.', 1)
on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, orden = excluded.orden;
delete from public.kits_prearmados_items where kit_id = (select id from public.kits_prearmados where slug = 'blancos-frescos');
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'blancos-frescos'), (select id from public.productos where slug = 'sauvignon-blanc-trevenezie-igt-2024'), 2);
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'blancos-frescos'), (select id from public.productos where slug = 'pinot-grigio-delle-venezie-doc-2024'), 2);
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'blancos-frescos'), (select id from public.productos where slug = 'falanghina-puglia-igt'), 1);
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'blancos-frescos'), (select id from public.productos where slug = 'soave-doc-2024'), 1);
insert into public.kits_prearmados (aliado_id, slug, nombre, descripcion, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'tintos-de-diario', 'Tintos de diario', 'Merlot, Cabernet y Montepulciano: tres tintos de La Selezione para abrir cualquier día.', 2)
on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, orden = excluded.orden;
delete from public.kits_prearmados_items where kit_id = (select id from public.kits_prearmados where slug = 'tintos-de-diario');
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'tintos-de-diario'), (select id from public.productos where slug = 'merlot-veneto-igt-2024'), 2);
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'tintos-de-diario'), (select id from public.productos where slug = 'cabernet-sauvignon-veneto-igt-2024'), 2);
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'tintos-de-diario'), (select id from public.productos where slug = 'montepulciano-d-abruzzo-doc-2024'), 2);
insert into public.kits_prearmados (aliado_id, slug, nombre, descripcion, orden) values ((select id from public.aliados where slug = 'aliado-cordoba'), 'burbujas', 'Burbujas', 'La caja de 6 de Bollicine: tres Prosecco y tres Rosé Extra Dry.', 3)
on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, orden = excluded.orden;
delete from public.kits_prearmados_items where kit_id = (select id from public.kits_prearmados where slug = 'burbujas');
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'burbujas'), (select id from public.productos where slug = 'prosecco-doc-spumante-brut-imperial'), 3);
insert into public.kits_prearmados_items (kit_id, producto_id, cantidad) values ((select id from public.kits_prearmados where slug = 'burbujas'), (select id from public.productos where slug = 'rose-extra-dry-921'), 3);

commit;
