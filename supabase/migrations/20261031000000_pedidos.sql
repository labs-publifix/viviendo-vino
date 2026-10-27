-- Pedidos y Finanzas (docs/ADMIN.md). Solo agrega tablas; no toca catálogo ni lista de espera.
-- RLS activo y sin acceso para anon ni authenticated: solo el servidor (secret key) lee y escribe.
-- Los precios, nombres y la comisión se copian al pedido al crearlo: si después cambian en el catálogo,
-- el pedido conserva lo que se cobró. Mercado Pago llena `pagos` cuando se conecte; hoy hay pedidos de prueba.

create sequence if not exists public.pedidos_folio_seq start 1001;

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique default ('VV-' || nextval('public.pedidos_folio_seq')::text),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  aliado_id uuid not null references public.aliados (id),
  estado text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado')),
  prueba boolean not null default false,
  -- Cliente y envío (los mismos campos que valida el checkout).
  cliente_nombre text not null check (char_length(cliente_nombre) between 1 and 120),
  cliente_email text not null check (char_length(cliente_email) <= 254),
  cliente_telefono text not null check (cliente_telefono ~ '^[0-9]{10}$'),
  calle text not null check (char_length(calle) <= 160),
  colonia text not null check (char_length(colonia) <= 120),
  codigo_postal text not null check (codigo_postal ~ '^[0-9]{5}$'),
  ciudad text not null check (char_length(ciudad) <= 120),
  estado_mx text not null check (char_length(estado_mx) <= 40),
  referencias text check (referencias is null or char_length(referencias) <= 300),
  recibe text check (recibe is null or char_length(recibe) <= 120),
  mayor_edad_at timestamptz not null default now(),
  factura boolean not null default false,
  promos boolean not null default false,
  origen text check (origen is null or char_length(origen) <= 60),
  -- Importes en centavos. total = subtotal + envío; comisión + aliado = total.
  subtotal_centavos integer not null check (subtotal_centavos >= 0),
  envio_centavos integer not null default 0 check (envio_centavos >= 0),
  total_centavos integer not null check (total_centavos = subtotal_centavos + envio_centavos),
  comision_bps integer not null check (comision_bps between 0 and 10000),
  comision_centavos integer not null check (comision_centavos between 0 and total_centavos),
  aliado_centavos integer not null check (aliado_centavos = total_centavos - comision_centavos),
  -- Envío y seguimiento.
  paqueteria text check (paqueteria is null or char_length(paqueteria) <= 60),
  guia text check (guia is null or char_length(guia) <= 80),
  pagado_at timestamptz,
  enviado_at timestamptz,
  entregado_at timestamptz,
  cancelado_at timestamptz,
  motivo_cancelacion text check (motivo_cancelacion is null or char_length(motivo_cancelacion) <= 300),
  kits smallint not null default 0 check (kits between 0 and 10)
);
create index if not exists pedidos_created_idx on public.pedidos (created_at desc);
create index if not exists pedidos_aliado_idx on public.pedidos (aliado_id, created_at desc);
create index if not exists pedidos_estado_idx on public.pedidos (estado);

-- Cada kit del pedido (6 botellas del mismo grupo) y sus botellas, con nombre y precio del momento.
create table if not exists public.pedido_kits (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  posicion smallint not null,
  grupo text not null check (char_length(grupo) <= 120),
  total_centavos integer not null check (total_centavos >= 0)
);
create index if not exists pedido_kits_pedido_idx on public.pedido_kits (pedido_id, posicion);

create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.pedido_kits (id) on delete cascade,
  producto_id uuid references public.productos (id) on delete set null,
  slug text not null,
  nombre text not null check (char_length(nombre) <= 200),
  precio_centavos integer not null check (precio_centavos >= 0),
  cantidad smallint not null check (cantidad between 1 and 6)
);
create index if not exists pedido_items_kit_idx on public.pedido_items (kit_id);

-- Historial de cada pedido: creación, cambios de estado, guía y notas del equipo, con quién lo hizo.
create table if not exists public.pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('creado', 'estado', 'guia', 'nota', 'pago')),
  estado text,
  detalle text check (detalle is null or char_length(detalle) <= 300),
  usuario_id uuid references public.admin_usuarios (id) on delete set null,
  usuario_nombre text
);
create index if not exists pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id, created_at);

-- Pagos (Mercado Pago cuando se conecte; "prueba" para los pedidos de prueba).
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  created_at timestamptz not null default now(),
  proveedor text not null check (proveedor in ('mercadopago', 'prueba')),
  referencia text check (referencia is null or char_length(referencia) <= 120),
  estado text not null check (estado in ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
  monto_centavos integer not null check (monto_centavos >= 0),
  comision_proveedor_centavos integer check (comision_proveedor_centavos is null or comision_proveedor_centavos >= 0)
);
create index if not exists pagos_pedido_idx on public.pagos (pedido_id);

-- Transferencias de Viviendo Vino a cada aliado (lo que se le paga de sus ventas entregadas).
create table if not exists public.transferencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  aliado_id uuid not null references public.aliados (id),
  fecha date not null,
  monto_centavos integer not null check (monto_centavos > 0),
  referencia text check (referencia is null or char_length(referencia) <= 120),
  nota text check (nota is null or char_length(nota) <= 300),
  prueba boolean not null default false,
  usuario_id uuid references public.admin_usuarios (id) on delete set null
);
create index if not exists transferencias_aliado_idx on public.transferencias (aliado_id, fecha desc);

alter table public.pedidos enable row level security;
alter table public.pedido_kits enable row level security;
alter table public.pedido_items enable row level security;
alter table public.pedido_eventos enable row level security;
alter table public.pagos enable row level security;
alter table public.transferencias enable row level security;
revoke all on public.pedidos, public.pedido_kits, public.pedido_items, public.pedido_eventos, public.pagos, public.transferencias from anon, authenticated;
revoke all on sequence public.pedidos_folio_seq from anon, authenticated;

-- Crea un pedido con sus kits y botellas en una sola transacción. El servidor ya validó todo y calculó los
-- importes con precios de la base; aquí solo se guarda. Solo el servidor (secret key) la puede ejecutar.
create or replace function public.crear_pedido(p_pedido jsonb, p_kits jsonb, p_evento jsonb) returns table (pedido_id uuid, pedido_folio text)
language plpgsql as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_folio text;
  v_kit jsonb;
  v_kit_id uuid;
  v_pos smallint := 0;
begin
  insert into public.pedidos (
    aliado_id, estado, prueba, cliente_nombre, cliente_email, cliente_telefono, calle, colonia, codigo_postal, ciudad,
    estado_mx, referencias, recibe, factura, promos, origen, subtotal_centavos, envio_centavos, total_centavos,
    comision_bps, comision_centavos, aliado_centavos, pagado_at
  )
  select (p->>'aliado_id')::uuid, p->>'estado', coalesce((p->>'prueba')::boolean, false), p->>'cliente_nombre',
    p->>'cliente_email', p->>'cliente_telefono', p->>'calle', p->>'colonia', p->>'codigo_postal', p->>'ciudad',
    p->>'estado_mx', nullif(p->>'referencias', ''), nullif(p->>'recibe', ''), coalesce((p->>'factura')::boolean, false),
    coalesce((p->>'promos')::boolean, false), nullif(p->>'origen', ''), (p->>'subtotal_centavos')::integer,
    (p->>'envio_centavos')::integer, (p->>'total_centavos')::integer, (p->>'comision_bps')::integer,
    (p->>'comision_centavos')::integer, (p->>'aliado_centavos')::integer,
    case when p->>'estado' = 'pagado' then now() end
  from (select p_pedido as p) as x
  returning pedidos.id, pedidos.folio into v_id, v_folio;

  for v_kit in select * from jsonb_array_elements(p_kits) loop
    v_pos := v_pos + 1;
    insert into public.pedido_kits (pedido_id, posicion, grupo, total_centavos)
    values (v_id, v_pos, v_kit->>'grupo', (v_kit->>'total_centavos')::integer)
    returning pedido_kits.id into v_kit_id;
    insert into public.pedido_items (kit_id, producto_id, slug, nombre, precio_centavos, cantidad)
    select v_kit_id, (i->>'producto_id')::uuid, i->>'slug', i->>'nombre', (i->>'precio_centavos')::integer, (i->>'cantidad')::smallint
    from jsonb_array_elements(v_kit->'items') as i;
  end loop;
  update public.pedidos set kits = v_pos where pedidos.id = v_id;

  insert into public.pedido_eventos (pedido_id, tipo, estado, detalle, usuario_id, usuario_nombre)
  values (v_id, 'creado', p_pedido->>'estado', p_evento->>'detalle', nullif(p_evento->>'usuario_id', '')::uuid, p_evento->>'usuario_nombre');

  if p_pedido->>'estado' = 'pagado' then
    insert into public.pagos (pedido_id, proveedor, estado, monto_centavos)
    values (v_id, case when coalesce((p_pedido->>'prueba')::boolean, false) then 'prueba' else 'mercadopago' end, 'aprobado', (p_pedido->>'total_centavos')::integer);
  end if;

  return query select v_id, v_folio;
end $$;
revoke all on function public.crear_pedido(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.crear_pedido(jsonb, jsonb, jsonb) to service_role;
