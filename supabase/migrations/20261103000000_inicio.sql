-- Inicio del panel (/admin): todas las cifras del tablero se calculan aquí, en la base, en una sola llamada.
-- El servidor nunca trae filas para contarlas, así que el tablero tarda lo mismo con 50 pedidos que con 500,000.
-- Solo agrega índices y una función de lectura; no cambia datos. Días en hora de la Ciudad de México.
--
-- p_aliado: null = toda la tienda (admin y atención); un id = solo lo de ese aliado (rol Aliado).
-- Lo que cada rol ve (montos, comunidad) lo decide el servidor al mostrarlo.

create index if not exists pedidos_pagado_idx on public.pedidos (pagado_at);
create index if not exists pedidos_estado_pagado_idx on public.pedidos (estado, pagado_at);
create index if not exists waitlist_signups_created_idx on public.waitlist_signups (created_at);
create index if not exists guide_requests_created_idx on public.guide_requests (created_at);
create index if not exists transferencias_aliado_monto_idx on public.transferencias (aliado_id);

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
      'mes', jsonb_build_object('n', count(*) filter (where v.dia >= t.mes), 'total', coalesce(sum(total_centavos) filter (where v.dia >= t.mes), 0), 'comision', coalesce(sum(comision_centavos) filter (where v.dia >= t.mes), 0), 'aliado', coalesce(sum(aliado_centavos) filter (where v.dia >= t.mes), 0))
    )
    from v, t
  ),
  -- Últimos 30 días, con ceros en los días sin ventas.
  'serie', (
    select coalesce(jsonb_agg(jsonb_build_object('dia', s.dia, 'n', coalesce(x.n, 0), 'total', coalesce(x.total, 0)) order by s.dia), '[]'::jsonb)
    from serie s
    left join (select dia, count(*) as n, sum(total_centavos) as total from v group by dia) x on x.dia = s.dia
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
