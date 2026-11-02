-- Inventario (2 nov 2026, docs/ADMIN.md). Existencias reales por vino; el interruptor "Agotado" deja de ser la
-- fuente: un vino está agotado cuando no le quedan botellas para vender. Cada cambio queda en un historial.
-- Apartados: al iniciar el pago, las botellas de un pedido "Pago pendiente" se apartan 30 minutos (renovable hasta
-- 3 veces). Al pagarse se descuentan; al cancelarse un pedido pagado, regresan. Todo se hace en funciones de la
-- base que bloquean los vinos involucrados: dos compras a la vez nunca venden la misma última botella.
-- Se puede volver a correr.

-- 1. Existencias por vino. Privadas: la tienda (llave publicable) solo ve "disponibles" con tienda_disponibles().
alter table public.productos add column if not exists existencias integer;
do $$
begin
  if not exists (select 1 from public.productos where existencias is not null) then
    -- Primera vez: 10 de cada etiqueta (el número real se confirma con el aliado en el panel).
    update public.productos set existencias = 10;
  end if;
end $$;
update public.productos set existencias = 0 where existencias is null;
alter table public.productos alter column existencias set default 0;
alter table public.productos alter column existencias set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_existencias_validas') then
    alter table public.productos add constraint productos_existencias_validas check (existencias >= 0);
  end if;
end $$;

-- "disponible" se queda como espejo de las existencias (para lo que aún lo lea), ya no se cambia a mano.
create or replace function public.productos_disponible_por_existencias() returns trigger
language plpgsql as $$
begin
  new.disponible := new.existencias > 0;
  return new;
end $$;
drop trigger if exists productos_disponible_por_existencias on public.productos;
create trigger productos_disponible_por_existencias before insert or update of existencias, disponible on public.productos
  for each row execute function public.productos_disponible_por_existencias();
update public.productos set disponible = existencias > 0 where disponible <> (existencias > 0);

-- 2. Historial de movimientos: quién, cuándo, cuánto y por qué cambió cada existencia.
create table if not exists public.inventario_movimientos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  cambio integer not null check (cambio <> 0),
  existencias integer not null check (existencias >= 0),
  motivo text not null check (motivo in ('inicial', 'ajuste', 'conteo', 'merma', 'venta', 'cancelacion')),
  pedido_id uuid references public.pedidos (id) on delete set null,
  usuario_id uuid,
  usuario_nombre text check (usuario_nombre is null or char_length(usuario_nombre) <= 120),
  nota text check (nota is null or char_length(nota) <= 200)
);
create index if not exists inventario_movimientos_producto_idx on public.inventario_movimientos (producto_id, created_at desc);
alter table public.inventario_movimientos enable row level security;
revoke all on public.inventario_movimientos from anon, authenticated;
insert into public.inventario_movimientos (producto_id, cambio, existencias, motivo, nota)
select p.id, p.existencias, p.existencias, 'inicial', 'Existencias iniciales'
from public.productos p
where p.existencias > 0 and not exists (select 1 from public.inventario_movimientos m where m.producto_id = p.id);

-- 3. Pedidos: apartado (hasta cuándo, cuántas renovaciones, llave del navegador que lo pidió) y si ya se descontó.
--    "vencido": un pago que nunca llegó (su apartado terminó hace más de un día o el cliente cambió su carrito).
alter table public.pedidos add column if not exists reserva_expira_at timestamptz;
alter table public.pedidos add column if not exists reserva_renovaciones smallint not null default 0;
alter table public.pedidos add column if not exists reserva_token_hash text;
alter table public.pedidos add column if not exists inventario_descontado boolean not null default false;
alter table public.pedidos drop constraint if exists pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente_pago', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado', 'vencido'));
create index if not exists pedidos_apartados_idx on public.pedidos (reserva_expira_at) where estado = 'pendiente_pago';
alter table public.pedido_eventos drop constraint if exists pedido_eventos_tipo_check;
alter table public.pedido_eventos add constraint pedido_eventos_tipo_check check (tipo in ('creado', 'estado', 'guia', 'nota', 'pago', 'inventario'));
alter table public.correos_enviados drop constraint if exists correos_enviados_tipo_check;
alter table public.correos_enviados add constraint correos_enviados_tipo_check
  check (tipo in ('pedido_confirmado', 'pedido_enviado', 'pedido_entregado', 'pedido_equipo', 'quiz_perfil', 'guia', 'inventario_pocas', 'inventario_agotado'));

-- 4. Funciones internas.

-- Botellas de un pedido por vino: [{producto_id, cantidad}].
create or replace function public._pedido_botellas(p_pedido uuid) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('producto_id', producto_id, 'cantidad', cantidad)), '[]'::jsonb)
  from (
    select pi.producto_id, sum(pi.cantidad)::int as cantidad
    from public.pedido_items pi
    join public.pedido_kits pk on pk.id = pi.kit_id
    where pk.pedido_id = p_pedido and pi.producto_id is not null
    group by pi.producto_id
  ) x
$$;

-- Bloquea los vinos pedidos y devuelve los que no alcanzan: [{producto_id, slug, nombre, pedidas, disponibles}].
-- Disponibles = existencias − lo apartado por otros pedidos con apartado vigente.
create or replace function public._inventario_faltantes(p_botellas jsonb, p_excluir uuid) returns jsonb
language plpgsql as $$
declare
  v jsonb := '[]'::jsonb;
  r record;
begin
  perform 1 from public.productos
  where id in (select (x->>'producto_id')::uuid from jsonb_array_elements(p_botellas) x)
  order by id for update;
  for r in
    select n.producto_id, n.cantidad, p.slug, p.nombre_oficial, p.activo,
      p.existencias - coalesce((
        select sum(pi.cantidad)
        from public.pedido_items pi
        join public.pedido_kits pk on pk.id = pi.kit_id
        join public.pedidos pe on pe.id = pk.pedido_id
        where pi.producto_id = n.producto_id and pe.estado = 'pendiente_pago' and pe.reserva_expira_at > now()
          and (p_excluir is null or pe.id <> p_excluir)
      ), 0) as disponibles
    from (
      select (x->>'producto_id')::uuid as producto_id, sum((x->>'cantidad')::int) as cantidad
      from jsonb_array_elements(p_botellas) x group by 1
    ) n
    join public.productos p on p.id = n.producto_id
  loop
    if not r.activo or r.disponibles < r.cantidad then
      v := v || jsonb_build_object('producto_id', r.producto_id, 'slug', r.slug, 'nombre', r.nombre_oficial, 'pedidas', r.cantidad, 'disponibles', greatest(r.disponibles, 0));
    end if;
  end loop;
  return v;
end $$;

-- Mueve las existencias de un pedido (signo −1 al venderse, +1 al cancelarse) y lo anota en el historial.
-- Devuelve [{producto_id, antes, despues}] para los avisos de pocas existencias.
create or replace function public._inventario_mover(p_pedido uuid, p_signo integer, p_motivo text, p_usuario_id uuid, p_usuario_nombre text) returns jsonb
language plpgsql as $$
declare
  v jsonb := '[]'::jsonb;
  r record;
  v_despues integer;
begin
  for r in select (x->>'producto_id')::uuid as producto_id, (x->>'cantidad')::int as cantidad from jsonb_array_elements(public._pedido_botellas(p_pedido)) x order by 1 loop
    update public.productos set existencias = existencias + p_signo * r.cantidad where id = r.producto_id returning existencias into v_despues;
    insert into public.inventario_movimientos (producto_id, cambio, existencias, motivo, pedido_id, usuario_id, usuario_nombre)
    values (r.producto_id, p_signo * r.cantidad, v_despues, p_motivo, p_pedido, p_usuario_id, p_usuario_nombre);
    v := v || jsonb_build_object('producto_id', r.producto_id, 'antes', v_despues - p_signo * r.cantidad, 'despues', v_despues);
  end loop;
  return v;
end $$;

create or replace function public._botellas_total(p_botellas jsonb) returns integer
language sql immutable as $$ select coalesce(sum((x->>'cantidad')::int), 0)::int from jsonb_array_elements(p_botellas) x $$;

-- 5. Crear pedido: igual que antes, más el inventario. "pendiente_pago" con reserva_minutos aparta las botellas;
--    "pagado" (pedidos de prueba) las descuenta. Si no alcanzan, no crea nada y avisa cuáles faltan.
drop function if exists public.crear_pedido(jsonb, jsonb, jsonb);
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
begin
  -- Limpieza: los pagos que nunca llegaron (apartado vencido hace más de un día) pasan a "vencido".
  update public.pedidos set estado = 'vencido', updated_at = now()
  where estado = 'pendiente_pago' and reserva_expira_at < now() - interval '1 day';

  insert into public.pedidos (
    aliado_id, estado, prueba, cliente_nombre, cliente_email, cliente_telefono, calle, colonia, codigo_postal, ciudad,
    estado_mx, referencias, recibe, factura, promos, origen, subtotal_centavos, envio_centavos, total_centavos,
    comision_bps, comision_centavos, aliado_centavos, modelo, comision_mp_centavos, pagado_at, reserva_token_hash
  )
  select (p->>'aliado_id')::uuid, 'pendiente_pago', coalesce((p->>'prueba')::boolean, false), p->>'cliente_nombre',
    p->>'cliente_email', p->>'cliente_telefono', p->>'calle', p->>'colonia', p->>'codigo_postal', p->>'ciudad',
    p->>'estado_mx', nullif(p->>'referencias', ''), nullif(p->>'recibe', ''), coalesce((p->>'factura')::boolean, false),
    coalesce((p->>'promos')::boolean, false), nullif(p->>'origen', ''), (p->>'subtotal_centavos')::integer,
    (p->>'envio_centavos')::integer, (p->>'total_centavos')::integer, (p->>'comision_bps')::integer,
    (p->>'comision_centavos')::integer, (p->>'aliado_centavos')::integer, coalesce(p->>'modelo', 'comision'),
    (p->>'comision_mp_centavos')::integer, null, nullif(p->>'reserva_token_hash', '')
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

-- 6. Renovar el apartado (botón "Confirmar existencias y apartar de nuevo"). Solo con la llave del navegador que lo
--    pidió y hasta p_max veces seguidas.
create or replace function public.renovar_apartado(p_pedido uuid, p_token_hash text, p_minutos integer, p_max integer)
returns table (reserva_expira_at timestamptz, renovaciones integer)
language plpgsql as $$
#variable_conflict use_column
declare
  v record;
  v_faltan jsonb;
  v_expira timestamptz := now() + make_interval(mins => p_minutos);
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null or v.estado <> 'pendiente_pago' or v.reserva_token_hash is null or v.reserva_token_hash <> p_token_hash then
    raise exception 'apartado_invalido';
  end if;
  if v.reserva_renovaciones >= p_max then
    raise exception 'limite_renovaciones';
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

-- 7. Soltar un apartado (el cliente cambió su carrito y pidió uno nuevo): el pedido queda "vencido".
create or replace function public.liberar_apartado(p_pedido uuid, p_token_hash text) returns boolean
language plpgsql as $$
declare
  v_ok boolean;
begin
  update public.pedidos set estado = 'vencido', reserva_expira_at = least(reserva_expira_at, now()), updated_at = now()
  where id = p_pedido and estado = 'pendiente_pago' and reserva_token_hash = p_token_hash
  returning true into v_ok;
  if v_ok then
    insert into public.pedido_eventos (pedido_id, tipo, estado, detalle)
    values (p_pedido, 'estado', 'vencido', 'El cliente cambió su carrito; se soltaron las botellas apartadas');
  end if;
  return coalesce(v_ok, false);
end $$;
revoke all on function public.liberar_apartado(uuid, text) from public, anon, authenticated;
grant execute on function public.liberar_apartado(uuid, text) to service_role;

-- 8. Pago aprobado: descuenta las botellas (si siguen ahí aunque el apartado haya vencido) y pasa a "Por preparar".
--    p_pago: {proveedor, referencia, comision_centavos, prueba}. p_evento: {detalle, usuario_id, usuario_nombre}.
create or replace function public.confirmar_pago(p_pedido uuid, p_pago jsonb, p_evento jsonb) returns jsonb
language plpgsql as $$
declare
  v record;
  v_faltan jsonb;
  v_cambios jsonb;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null or v.estado <> 'pendiente_pago' then
    raise exception 'estado_invalido';
  end if;
  v_faltan := public._inventario_faltantes(public._pedido_botellas(p_pedido), p_pedido);
  if jsonb_array_length(v_faltan) > 0 then
    raise exception 'sin_existencias' using detail = v_faltan::text;
  end if;
  v_cambios := public._inventario_mover(p_pedido, -1, 'venta', nullif(p_evento->>'usuario_id', '')::uuid, p_evento->>'usuario_nombre');
  update public.pedidos
  set estado = 'pagado', pagado_at = now(), updated_at = now(), inventario_descontado = true, reserva_expira_at = null,
    prueba = prueba or coalesce((p_pago->>'prueba')::boolean, false)
  where id = p_pedido;
  insert into public.pagos (pedido_id, proveedor, referencia, estado, monto_centavos, comision_proveedor_centavos)
  values (p_pedido, coalesce(p_pago->>'proveedor', 'prueba'), nullif(p_pago->>'referencia', ''), 'aprobado', v.total_centavos,
    coalesce(nullif(p_pago->>'comision_centavos', '')::integer, v.comision_mp_centavos));
  insert into public.pedido_eventos (pedido_id, tipo, estado, detalle, usuario_id, usuario_nombre)
  values (p_pedido, 'estado', 'pagado', nullif(p_evento->>'detalle', ''), nullif(p_evento->>'usuario_id', '')::uuid, p_evento->>'usuario_nombre'),
    (p_pedido, 'inventario', null, 'Se descontaron ' || public._botellas_total(public._pedido_botellas(p_pedido)) || ' botellas del inventario', null, null);
  return v_cambios;
end $$;
revoke all on function public.confirmar_pago(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.confirmar_pago(uuid, jsonb, jsonb) to service_role;

-- 9. Pedido cancelado: si ya se habían descontado sus botellas, regresan al inventario (una sola vez).
create or replace function public.devolver_inventario(p_pedido uuid, p_usuario_id uuid, p_usuario_nombre text) returns jsonb
language plpgsql as $$
declare
  v record;
  v_cambios jsonb;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null or not v.inventario_descontado or v.estado <> 'cancelado' then
    return '[]'::jsonb;
  end if;
  perform 1 from public.productos where id in (select (x->>'producto_id')::uuid from jsonb_array_elements(public._pedido_botellas(p_pedido)) x) order by id for update;
  v_cambios := public._inventario_mover(p_pedido, 1, 'cancelacion', p_usuario_id, p_usuario_nombre);
  update public.pedidos set inventario_descontado = false where id = p_pedido;
  insert into public.pedido_eventos (pedido_id, tipo, detalle)
  values (p_pedido, 'inventario', 'Regresaron ' || public._botellas_total(public._pedido_botellas(p_pedido)) || ' botellas al inventario');
  return v_cambios;
end $$;
revoke all on function public.devolver_inventario(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.devolver_inventario(uuid, uuid, text) to service_role;

-- 10. Ajuste desde el panel (admin o el aliado dueño; el servidor lo revisa antes de llamar). Con p_fijar fija el
--     número exacto (conteo físico) y, si se manda p_esperado, solo si nadie lo cambió mientras tanto.
create or replace function public.ajustar_existencias(
  p_producto uuid, p_cambio integer, p_fijar integer, p_esperado integer, p_motivo text, p_nota text, p_usuario_id uuid, p_usuario_nombre text
) returns jsonb
language plpgsql as $$
declare
  v_antes integer;
  v_cambio integer;
  v_despues integer;
begin
  select existencias into v_antes from public.productos where id = p_producto for update;
  if v_antes is null then
    raise exception 'producto_no_existe';
  end if;
  if p_fijar is not null then
    if p_esperado is not null and p_esperado <> v_antes then
      raise exception 'cambio_concurrente' using detail = v_antes::text;
    end if;
    v_cambio := p_fijar - v_antes;
  else
    v_cambio := coalesce(p_cambio, 0);
  end if;
  v_despues := v_antes + v_cambio;
  if v_despues < 0 or v_despues > 100000 then
    raise exception 'existencias_invalidas' using detail = v_antes::text;
  end if;
  if v_cambio <> 0 then
    update public.productos set existencias = v_despues where id = p_producto;
    insert into public.inventario_movimientos (producto_id, cambio, existencias, motivo, usuario_id, usuario_nombre, nota)
    values (p_producto, v_cambio, v_despues, p_motivo, p_usuario_id, p_usuario_nombre, nullif(p_nota, ''));
  end if;
  return jsonb_build_object('antes', v_antes, 'despues', v_despues);
end $$;
revoke all on function public.ajustar_existencias(uuid, integer, integer, integer, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.ajustar_existencias(uuid, integer, integer, integer, text, text, uuid, text) to service_role;

-- 11. Lo que la tienda puede saber: botellas disponibles por vino activo (existencias − apartados vigentes), con
--     tope de 60 (10 kits) para no publicar el inventario real.
create or replace function public.tienda_disponibles() returns table (producto_id uuid, disponibles integer)
language sql stable security definer set search_path = public as $$
  select p.id, least(greatest(p.existencias - coalesce(a.cantidad, 0), 0), 60)::integer
  from public.productos p
  left join (
    select pi.producto_id, sum(pi.cantidad) as cantidad
    from public.pedido_items pi
    join public.pedido_kits pk on pk.id = pi.kit_id
    join public.pedidos pe on pe.id = pk.pedido_id
    where pe.estado = 'pendiente_pago' and pe.reserva_expira_at > now()
    group by pi.producto_id
  ) a on a.producto_id = p.id
  where p.activo
$$;
revoke all on function public.tienda_disponibles() from public;
grant execute on function public.tienda_disponibles() to anon, authenticated, service_role;

-- Las funciones internas solo las usa el servidor.
revoke all on function public._pedido_botellas(uuid) from public, anon, authenticated;
revoke all on function public._inventario_faltantes(jsonb, uuid) from public, anon, authenticated;
revoke all on function public._inventario_mover(uuid, integer, text, uuid, text) from public, anon, authenticated;
revoke all on function public._botellas_total(jsonb) from public, anon, authenticated;
grant execute on function public._pedido_botellas(uuid), public._inventario_faltantes(jsonb, uuid), public._inventario_mover(uuid, integer, text, uuid, text), public._botellas_total(jsonb) to service_role;

-- Apartados por vino para el panel: cuántas botellas hay en pagos en curso.
create or replace function public.admin_apartados() returns table (producto_id uuid, apartadas integer)
language sql stable as $$
  select pi.producto_id, sum(pi.cantidad)::integer
  from public.pedido_items pi
  join public.pedido_kits pk on pk.id = pi.kit_id
  join public.pedidos pe on pe.id = pk.pedido_id
  where pe.estado = 'pendiente_pago' and pe.reserva_expira_at > now() and pi.producto_id is not null
  group by pi.producto_id
$$;
revoke all on function public.admin_apartados() from public, anon, authenticated;
grant execute on function public.admin_apartados() to service_role;

-- 12. Inicio: agotados y "pocas" (3 o menos) según las existencias; "esperando pago" sin contar apartados vencidos.
create or replace function public.admin_inicio(p_aliado uuid default null) returns jsonb
language sql stable as $$
with
  t as (
    select
      (now() at time zone 'America/Mexico_City')::date as hoy,
      date_trunc('month', now() at time zone 'America/Mexico_City')::date as mes
  ),
  p as (
    select pe.*, coalesce(cc.plazo_preparacion_dias, 2) as plazo_dias
    from public.pedidos pe
    left join public.configuracion_comercial cc on cc.aliado_id = pe.aliado_id
    where p_aliado is null or pe.aliado_id = p_aliado
  ),
  v as (
    select p.*, (coalesce(p.pagado_at, p.created_at) at time zone 'America/Mexico_City')::date as dia
    from p
    where p.estado in ('pagado', 'preparando', 'enviado', 'entregado')
  ),
  -- Por preparar = pagado o preparando. Atrasado = lleva más días que el plazo de preparación del aliado.
  pend as (
    select p.*, extract(epoch from (now() - coalesce(p.pagado_at, p.created_at))) / 3600 as horas
    from p
    where p.estado in ('pagado', 'preparando')
  ),
  serie as (
    select d::date as dia
    from t, generate_series(t.hoy - 29, t.hoy, interval '1 day') as d
  )
select jsonb_build_object(
  'pedidos', jsonb_build_object(
    'por_preparar', (select count(*) from pend),
    'atrasados', (select count(*) from pend where horas > plazo_dias * 24),
    'en_camino', (select count(*) from p where estado = 'enviado'),
    'entregados_hoy', (select count(*) from p, t where estado = 'entregado' and (entregado_at at time zone 'America/Mexico_City')::date = t.hoy),
    'sin_pago', (select count(*) from p where estado = 'pendiente_pago' and (reserva_expira_at is null or reserva_expira_at > now()))
  ),
  'atrasados', (
    select coalesce(jsonb_agg(x order by x->>'desde'), '[]'::jsonb)
    from (
      select jsonb_build_object('id', id, 'folio', folio, 'estado', estado, 'desde', coalesce(pagado_at, created_at), 'horas', round(horas), 'ciudad', ciudad, 'estado_mx', estado_mx, 'prueba', prueba) as x
      from pend
      where horas > plazo_dias * 24
      order by coalesce(pagado_at, created_at)
      limit 5
    ) a
  ),
  'ventas', (
    select jsonb_build_object(
      'hoy', jsonb_build_object('n', count(*) filter (where v.dia = t.hoy), 'total', coalesce(sum(total_centavos) filter (where v.dia = t.hoy), 0), 'aliado', coalesce(sum(aliado_centavos) filter (where v.dia = t.hoy), 0)),
      'semana', jsonb_build_object('n', count(*) filter (where v.dia > t.hoy - 7), 'total', coalesce(sum(total_centavos) filter (where v.dia > t.hoy - 7), 0), 'aliado', coalesce(sum(aliado_centavos) filter (where v.dia > t.hoy - 7), 0)),
      'mes', jsonb_build_object('n', count(*) filter (where v.dia >= t.mes), 'total', coalesce(sum(total_centavos) filter (where v.dia >= t.mes), 0), 'comision', coalesce(sum(comision_centavos) filter (where v.dia >= t.mes), 0), 'mp', coalesce(sum(comision_mp_centavos) filter (where v.dia >= t.mes), 0), 'aliado', coalesce(sum(aliado_centavos) filter (where v.dia >= t.mes), 0))
    )
    from v, t
  ),
  -- Últimos 30 días, con ceros en los días sin ventas.
  'serie', (
    select coalesce(jsonb_agg(jsonb_build_object('dia', s.dia, 'n', coalesce(x.n, 0), 'total', coalesce(x.total, 0), 'aliado', coalesce(x.aliado, 0)) order by s.dia), '[]'::jsonb)
    from serie s
    left join (select dia, count(*) as n, sum(total_centavos) as total, sum(aliado_centavos) as aliado from v group by dia) x on x.dia = s.dia
  ),
  -- Saldo de cada aliado: lo suyo de pedidos entregados menos lo ya transferido.
  'aliados', (
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'nombre', a.nombre, 'por_transferir', coalesce(e.ganado, 0) - coalesce(tr.transferido, 0), 'en_camino', coalesce(e.en_camino, 0), 'ultima_transferencia', tr.ultima) order by a.nombre), '[]'::jsonb)
    from public.aliados a
    left join (
      select aliado_id, sum(aliado_centavos) filter (where estado = 'entregado') as ganado, sum(aliado_centavos) filter (where estado in ('pagado', 'preparando', 'enviado')) as en_camino
      from public.pedidos group by aliado_id
    ) e on e.aliado_id = a.id
    left join (select aliado_id, sum(monto_centavos) as transferido, max(fecha) as ultima from public.transferencias group by aliado_id) tr on tr.aliado_id = a.id
    where a.activo and (p_aliado is null or a.id = p_aliado)
  ),
  'catalogo', (
    select jsonb_build_object('agotados', count(*) filter (where activo and existencias = 0), 'pocas', count(*) filter (where activo and existencias between 1 and 3), 'ocultos', count(*) filter (where not activo), 'vinos', count(*) filter (where activo))
    from public.productos
    where p_aliado is null or aliado_id = p_aliado
  ),
  -- Comunidad y contenido (solo para toda la tienda; el aliado no lo ve).
  'comunidad', case when p_aliado is null then (
    select jsonb_build_object(
      'lista_total', (select count(*) from public.waitlist_signups where unsubscribed_at is null),
      'lista_semana', (select count(*) from public.waitlist_signups where created_at > now() - interval '7 days'),
      'quiz_semana', (select count(*) from public.quiz_sessions where created_at > now() - interval '7 days'),
      'scans_semana', (select count(*) from public.wine_scans where created_at > now() - interval '7 days'),
      'guias_semana', (select count(*) from public.guide_requests where created_at > now() - interval '7 days'),
      'correos_fallidos_semana', (select count(*) from public.correos_enviados where estado = 'fallo' and created_at > now() - interval '7 days'),
      'anuncios_activos', (select count(*) from public.anuncios where activo and (inicia_at is null or inicia_at <= now()) and (termina_at is null or termina_at > now()))
    )
  ) end
)
$$;
revoke all on function public.admin_inicio(uuid) from public, anon, authenticated;
grant execute on function public.admin_inicio(uuid) to service_role;
