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
