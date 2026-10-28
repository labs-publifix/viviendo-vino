-- Modelo broker (28 oct 2026, docs/ADMIN.md). El aliado acuerda con Viviendo Vino un precio especial por botella
-- (neto, con IVA y con envío incluido) y siempre recibe ese monto íntegro. Viviendo Vino decide el precio público;
-- su margen es la diferencia y de ahí paga la comisión de Mercado Pago. Reemplaza la comisión del 10 %.
-- Solo agrega columnas y actualiza dos funciones. Se puede volver a correr.

-- 1. Precio acordado con el aliado, por vino. Privado: la tienda (llave publicable) NO puede leerlo.
alter table public.productos add column if not exists precio_aliado_centavos integer;
-- Hoy los 19 precios de la tienda son los acordados con el aliado: se copian una sola vez.
update public.productos set precio_aliado_centavos = precio_centavos where precio_aliado_centavos is null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_precio_aliado_valido') then
    alter table public.productos add constraint productos_precio_aliado_valido
      check (precio_aliado_centavos is null or (precio_aliado_centavos > 0 and precio_aliado_centavos <= precio_centavos));
  end if;
end $$;

-- 1b. Marquesina: el mensaje con el precio escrito a mano pasa a {desde}, que la tienda cambia por el precio del
--     kit más barato del momento (así no queda viejo al ajustar precios).
update public.anuncios set texto = replace(texto, '$1,800', '{desde}') where texto like '%$1,800%';

-- 2. Margen mínimo de Viviendo Vino por aliado (sobre el precio final). 2000 = 20 %.
alter table public.configuracion_comercial add column if not exists margen_minimo_bps integer not null default 2000;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'configuracion_comercial_margen_valido') then
    alter table public.configuracion_comercial add constraint configuracion_comercial_margen_valido check (margen_minimo_bps between 0 and 9000);
  end if;
end $$;

-- 3. Pedidos: cada botella guarda su precio acordado del momento; el pedido guarda el modelo con que se calculó y
--    la comisión de Mercado Pago (estimada al crearlo; la real cuando se conecte el cobro).
--    En el modelo broker: aliado_centavos = suma de precios acordados; comision_centavos = margen bruto de VV.
alter table public.pedido_items add column if not exists precio_aliado_centavos integer check (precio_aliado_centavos is null or precio_aliado_centavos >= 0);
alter table public.pedidos alter column comision_bps drop not null;
alter table public.pedidos add column if not exists modelo text not null default 'comision';
alter table public.pedidos add column if not exists comision_mp_centavos integer;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_modelo_valido') then
    alter table public.pedidos add constraint pedidos_modelo_valido check (modelo in ('comision', 'broker'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pedidos_comision_mp_valida') then
    alter table public.pedidos add constraint pedidos_comision_mp_valida check (comision_mp_centavos is null or comision_mp_centavos >= 0);
  end if;
end $$;

-- 4. crear_pedido: igual que antes, más el precio acordado de cada botella, el modelo y la comisión de MP.
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
    comision_bps, comision_centavos, aliado_centavos, modelo, comision_mp_centavos, pagado_at
  )
  select (p->>'aliado_id')::uuid, p->>'estado', coalesce((p->>'prueba')::boolean, false), p->>'cliente_nombre',
    p->>'cliente_email', p->>'cliente_telefono', p->>'calle', p->>'colonia', p->>'codigo_postal', p->>'ciudad',
    p->>'estado_mx', nullif(p->>'referencias', ''), nullif(p->>'recibe', ''), coalesce((p->>'factura')::boolean, false),
    coalesce((p->>'promos')::boolean, false), nullif(p->>'origen', ''), (p->>'subtotal_centavos')::integer,
    (p->>'envio_centavos')::integer, (p->>'total_centavos')::integer, (p->>'comision_bps')::integer,
    (p->>'comision_centavos')::integer, (p->>'aliado_centavos')::integer, coalesce(p->>'modelo', 'comision'),
    (p->>'comision_mp_centavos')::integer,
    case when p->>'estado' = 'pagado' then now() end
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
  values (v_id, 'creado', p_pedido->>'estado', p_evento->>'detalle', nullif(p_evento->>'usuario_id', '')::uuid, p_evento->>'usuario_nombre');

  if p_pedido->>'estado' = 'pagado' then
    insert into public.pagos (pedido_id, proveedor, estado, monto_centavos, comision_proveedor_centavos)
    values (v_id, case when coalesce((p_pedido->>'prueba')::boolean, false) then 'prueba' else 'mercadopago' end, 'aprobado',
      (p_pedido->>'total_centavos')::integer, (p_pedido->>'comision_mp_centavos')::integer);
  end if;

  return query select v_id, v_folio;
end $$;
revoke all on function public.crear_pedido(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.crear_pedido(jsonb, jsonb, jsonb) to service_role;

-- 5. Inicio: suma también la comisión de Mercado Pago del mes y lo del aliado por día (su gráfica).
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
    'sin_pago', (select count(*) from p where estado = 'pendiente_pago')
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
    select jsonb_build_object('agotados', count(*) filter (where activo and not disponible), 'ocultos', count(*) filter (where not activo), 'vinos', count(*) filter (where activo))
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
