-- Códigos de descuento (2 nov 2026, docs/ADMIN.md). Rafael los crea en el panel para campañas; el cliente lo
-- escribe en el checkout o llega con un enlace ?codigo=. Modelo broker: el descuento sale del margen de Viviendo Vino
-- (el aliado recibe íntegro su precio acordado) y el servidor lo recorta para no bajar de "acordado + comisión de MP".
-- Un código por pedido. Los usos se cuentan como el inventario: apartados mientras dura el pago y definitivos al pagar.
-- Sin código, los pedidos quedan exactamente igual que antes (descuento 0). Se puede volver a correr.

-- 1. Códigos.
create table if not exists public.codigos_descuento (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{3,20}$'),
  descripcion text check (descripcion is null or char_length(descripcion) <= 200),
  texto_publico text not null check (char_length(texto_publico) between 5 and 160),
  tipo text not null check (tipo in ('porcentaje', 'monto')),
  -- porcentaje: puntos base (1000 = 10 %); monto: centavos.
  valor integer not null check (valor > 0 and (tipo <> 'porcentaje' or valor <= 9000)),
  tope_centavos integer check (tope_centavos is null or tope_centavos > 0),
  inicia_at timestamptz not null default now(),
  termina_at timestamptz,
  usos_max integer check (usos_max is null or usos_max > 0),
  usos_por_cliente integer check (usos_por_cliente is null or usos_por_cliente > 0),
  min_kits smallint check (min_kits is null or min_kits between 1 and 10),
  solo_primera_compra boolean not null default false,
  activo boolean not null default true,
  creado_por uuid,
  creado_por_nombre text check (creado_por_nombre is null or char_length(creado_por_nombre) <= 120),
  constraint codigos_descuento_fechas check (termina_at is null or termina_at > inicia_at)
);
alter table public.codigos_descuento enable row level security;
revoke all on public.codigos_descuento from anon, authenticated;

-- 2. Pedidos: el código usado (con su texto copiado) y el descuento. total = subtotal − descuento + envío.
alter table public.pedidos add column if not exists codigo_id uuid references public.codigos_descuento (id) on delete set null;
alter table public.pedidos add column if not exists codigo text;
alter table public.pedidos add column if not exists descuento_centavos integer not null default 0;
do $$
declare
  r record;
begin
  -- La regla anterior (total = subtotal + envío) se reemplaza por la que incluye el descuento.
  for r in
    select conname from pg_constraint
    where conrelid = 'public.pedidos'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%total_centavos = (subtotal_centavos + envio_centavos)%'
  loop
    execute format('alter table public.pedidos drop constraint %I', r.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'pedidos_total_con_descuento') then
    alter table public.pedidos add constraint pedidos_total_con_descuento
      check (descuento_centavos >= 0 and descuento_centavos <= subtotal_centavos and total_centavos = subtotal_centavos - descuento_centavos + envio_centavos);
  end if;
end $$;
create index if not exists pedidos_codigo_idx on public.pedidos (codigo_id) where codigo_id is not null;

-- 3. ¿Se puede usar este código en este pedido? null = sí; si no, el motivo. p_vigencia = false solo revisa usos
--    (al renovar un apartado: el descuento ya quedó fijado). Cuentan los pedidos pagados y los apartados vigentes.
create or replace function public._codigo_motivo(p_codigo uuid, p_excluir uuid, p_email text, p_kits integer, p_vigencia boolean) returns text
language plpgsql stable as $$
declare
  c record;
  n integer;
begin
  select * into c from public.codigos_descuento where id = p_codigo;
  if c.id is null then
    return 'no_existe';
  end if;
  if p_vigencia then
    if not c.activo then return 'pausado'; end if;
    if c.inicia_at > now() then return 'programado'; end if;
    if c.termina_at is not null and c.termina_at <= now() then return 'vencido'; end if;
    if c.min_kits is not null and coalesce(p_kits, 0) < c.min_kits then return 'min_kits'; end if;
  end if;
  if c.usos_max is not null then
    select count(*) into n from public.pedidos
    where codigo_id = p_codigo and (p_excluir is null or id <> p_excluir)
      and (estado in ('pagado', 'preparando', 'enviado', 'entregado') or (estado = 'pendiente_pago' and reserva_expira_at > now()));
    if n >= c.usos_max then return 'agotado'; end if;
  end if;
  if nullif(p_email, '') is not null then
    if c.usos_por_cliente is not null then
      select count(*) into n from public.pedidos
      where codigo_id = p_codigo and (p_excluir is null or id <> p_excluir) and lower(cliente_email) = lower(p_email)
        and (estado in ('pagado', 'preparando', 'enviado', 'entregado') or (estado = 'pendiente_pago' and reserva_expira_at > now()));
      if n >= c.usos_por_cliente then return 'usado'; end if;
    end if;
    if c.solo_primera_compra and exists (
      select 1 from public.pedidos
      where lower(cliente_email) = lower(p_email) and (p_excluir is null or id <> p_excluir)
        and estado in ('pagado', 'preparando', 'enviado', 'entregado')
    ) then
      return 'primera_compra';
    end if;
  end if;
  return null;
end $$;
revoke all on function public._codigo_motivo(uuid, uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public._codigo_motivo(uuid, uuid, text, integer, boolean) to service_role;

-- 4. Lo único que la tienda puede saber: si hay algún código activo (para mostrar o no el campo en el checkout).
create or replace function public.tienda_hay_codigos() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.codigos_descuento where activo and inicia_at <= now() and (termina_at is null or termina_at > now()))
$$;
revoke all on function public.tienda_hay_codigos() from public;
grant execute on function public.tienda_hay_codigos() to anon, authenticated, service_role;

-- 5. Crear pedido: igual que en 20261105000000_inventario.sql, más el código y el descuento.
create or replace function public.crear_pedido(p_pedido jsonb, p_kits jsonb, p_evento jsonb)
returns table (pedido_id uuid, pedido_folio text, cambios jsonb, reserva_expira_at timestamptz)
language plpgsql as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_folio text;
  v_kit jsonb;
  v_kit_id uuid;
  v_pos smallint := 0;
  v_faltan jsonb;
  v_cambios jsonb := '[]'::jsonb;
  v_minutos integer := nullif(p_pedido->>'reserva_minutos', '')::integer;
  v_expira timestamptz;
  v_codigo uuid := nullif(p_pedido->>'codigo_id', '')::uuid;
  v_motivo text;
begin
  -- Limpieza: los pagos que nunca llegaron (apartado vencido hace más de un día) pasan a "vencido".
  update public.pedidos set estado = 'vencido', updated_at = now()
  where estado = 'pendiente_pago' and reserva_expira_at < now() - interval '1 day';

  insert into public.pedidos (
    aliado_id, estado, prueba, cliente_nombre, cliente_email, cliente_telefono, calle, colonia, codigo_postal, ciudad,
    estado_mx, referencias, recibe, factura, promos, origen, subtotal_centavos, envio_centavos, total_centavos,
    comision_bps, comision_centavos, aliado_centavos, modelo, comision_mp_centavos, pagado_at, reserva_token_hash,
    codigo_id, codigo, descuento_centavos
  )
  select (p->>'aliado_id')::uuid, 'pendiente_pago', coalesce((p->>'prueba')::boolean, false), p->>'cliente_nombre',
    p->>'cliente_email', p->>'cliente_telefono', p->>'calle', p->>'colonia', p->>'codigo_postal', p->>'ciudad',
    p->>'estado_mx', nullif(p->>'referencias', ''), nullif(p->>'recibe', ''), coalesce((p->>'factura')::boolean, false),
    coalesce((p->>'promos')::boolean, false), nullif(p->>'origen', ''), (p->>'subtotal_centavos')::integer,
    (p->>'envio_centavos')::integer, (p->>'total_centavos')::integer, (p->>'comision_bps')::integer,
    (p->>'comision_centavos')::integer, (p->>'aliado_centavos')::integer, coalesce(p->>'modelo', 'comision'),
    (p->>'comision_mp_centavos')::integer, null, nullif(p->>'reserva_token_hash', ''),
    v_codigo, case when v_codigo is null then null else upper(p->>'codigo') end, coalesce(nullif(p->>'descuento_centavos', '')::integer, 0)
  from (select p_pedido as p) as x
  returning pedidos.id, pedidos.folio into v_id, v_folio;

  for v_kit in select * from jsonb_array_elements(p_kits) loop
    v_pos := v_pos + 1;
    insert into public.pedido_kits (pedido_id, posicion, grupo, total_centavos)
    values (v_id, v_pos, v_kit->>'grupo', (v_kit->>'total_centavos')::integer)
    returning pedido_kits.id into v_kit_id;
    insert into public.pedido_items (kit_id, producto_id, slug, nombre, precio_centavos, precio_aliado_centavos, cantidad)
    select v_kit_id, (i->>'producto_id')::uuid, i->>'slug', i->>'nombre', (i->>'precio_centavos')::integer,
      (i->>'precio_aliado_centavos')::integer, (i->>'cantidad')::smallint
    from jsonb_array_elements(v_kit->'items') as i;
  end loop;
  update public.pedidos set kits = v_pos where pedidos.id = v_id;

  insert into public.pedido_eventos (pedido_id, tipo, estado, detalle, usuario_id, usuario_nombre)
  values (v_id, 'creado', 'pendiente_pago', p_evento->>'detalle', nullif(p_evento->>'usuario_id', '')::uuid, p_evento->>'usuario_nombre');

  -- Código de descuento: se bloquea y se revisa con el pedido ya contado (vigencia, usos, por cliente, mínimo).
  if v_codigo is not null then
    perform 1 from public.codigos_descuento where id = v_codigo for update;
    v_motivo := public._codigo_motivo(v_codigo, v_id, p_pedido->>'cliente_email', v_pos, true);
    if v_motivo is not null then
      raise exception 'codigo_invalido' using detail = v_motivo;
    end if;
  end if;

  v_faltan := public._inventario_faltantes(public._pedido_botellas(v_id), v_id);
  if jsonb_array_length(v_faltan) > 0 then
    raise exception 'sin_existencias' using detail = v_faltan::text;
  end if;

  if p_pedido->>'estado' = 'pagado' then
    v_cambios := public._inventario_mover(v_id, -1, 'venta', nullif(p_evento->>'usuario_id', '')::uuid, p_evento->>'usuario_nombre');
    update public.pedidos set estado = 'pagado', pagado_at = now(), inventario_descontado = true where pedidos.id = v_id;
    insert into public.pagos (pedido_id, proveedor, estado, monto_centavos, comision_proveedor_centavos)
    values (v_id, case when coalesce((p_pedido->>'prueba')::boolean, false) then 'prueba' else 'mercadopago' end, 'aprobado',
      (p_pedido->>'total_centavos')::integer, (p_pedido->>'comision_mp_centavos')::integer);
    insert into public.pedido_eventos (pedido_id, tipo, estado, detalle, usuario_id, usuario_nombre)
    values (v_id, 'estado', 'pagado', null, nullif(p_evento->>'usuario_id', '')::uuid, p_evento->>'usuario_nombre'),
      (v_id, 'inventario', null, 'Se descontaron ' || public._botellas_total(public._pedido_botellas(v_id)) || ' botellas del inventario', null, null);
  elsif v_minutos is not null then
    v_expira := now() + make_interval(mins => v_minutos);
    update public.pedidos set reserva_expira_at = v_expira where pedidos.id = v_id;
    insert into public.pedido_eventos (pedido_id, tipo, detalle)
    values (v_id, 'inventario', 'Botellas apartadas ' || v_minutos || ' minutos mientras se paga');
  end if;

  return query select v_id, v_folio, v_cambios, v_expira;
end $$;
revoke all on function public.crear_pedido(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.crear_pedido(jsonb, jsonb, jsonb) to service_role;

-- 6. Renovar el apartado: igual que antes, más volver a contar los usos del código.
create or replace function public.renovar_apartado(p_pedido uuid, p_token_hash text, p_minutos integer, p_max integer)
returns table (reserva_expira_at timestamptz, renovaciones integer)
language plpgsql as $$
#variable_conflict use_column
declare
  v record;
  v_faltan jsonb;
  v_expira timestamptz := now() + make_interval(mins => p_minutos);
  v_motivo text;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null or v.estado <> 'pendiente_pago' or v.reserva_token_hash is null or v.reserva_token_hash <> p_token_hash then
    raise exception 'apartado_invalido';
  end if;
  if v.reserva_renovaciones >= p_max then
    raise exception 'limite_renovaciones';
  end if;
  -- Con código: el descuento se respeta, pero sus usos se vuelven a contar (el apartado vencido ya no los guardaba).
  if v.codigo_id is not null then
    perform 1 from public.codigos_descuento where id = v.codigo_id for update;
    v_motivo := public._codigo_motivo(v.codigo_id, p_pedido, v.cliente_email, v.kits, false);
    if v_motivo is not null then
      raise exception 'codigo_invalido' using detail = v_motivo;
    end if;
  end if;
  v_faltan := public._inventario_faltantes(public._pedido_botellas(p_pedido), p_pedido);
  if jsonb_array_length(v_faltan) > 0 then
    raise exception 'sin_existencias' using detail = v_faltan::text;
  end if;
  update public.pedidos set reserva_expira_at = v_expira, reserva_renovaciones = v.reserva_renovaciones + 1, updated_at = now() where id = p_pedido;
  insert into public.pedido_eventos (pedido_id, tipo, detalle)
  values (p_pedido, 'inventario', 'Apartado renovado (' || (v.reserva_renovaciones + 1) || ' de ' || p_max || ')');
  return query select v_expira, (v.reserva_renovaciones + 1)::integer;
end $$;
revoke all on function public.renovar_apartado(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.renovar_apartado(uuid, text, integer, integer) to service_role;

