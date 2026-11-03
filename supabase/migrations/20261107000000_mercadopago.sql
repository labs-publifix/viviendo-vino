-- Mercado Pago (3 nov 2026, docs/ADMIN.md). Cobro con tarjeta dentro del sitio (Card Payment Brick + API de Orders).
-- El pedido guarda la orden de Mercado Pago de su último intento y su estado. Mientras un pago está "en revisión"
-- (antifraude) o esperando el reto 3-D Secure del banco, las botellas siguen apartadas (hasta 48 h o 45 min).
-- Solo agrega columnas y una función. Se puede volver a correr.

alter table public.pedidos add column if not exists mp_order_id text check (mp_order_id is null or char_length(mp_order_id) <= 80);
-- "status/status_detail" del último intento (p. ej. processing/in_review, processed/accredited, failed/rejected_by_issuer).
alter table public.pedidos add column if not exists mp_estado text check (mp_estado is null or char_length(mp_estado) <= 80);
alter table public.pedidos add column if not exists mp_actualizado_at timestamptz;
create unique index if not exists pedidos_mp_order_idx on public.pedidos (mp_order_id) where mp_order_id is not null;

-- Asegura las botellas de un pedido "Pago pendiente" por p_minutos más (sin contar como renovación): justo antes de
-- cobrar, mientras el banco pide el reto 3-D Secure y mientras Mercado Pago revisa el pago. Si ya no alcanzan,
-- no cobra (sin_existencias). Nunca acorta un apartado que dura más.
create or replace function public.asegurar_apartado(p_pedido uuid, p_minutos integer) returns timestamptz
language plpgsql as $$
declare
  v record;
  v_faltan jsonb;
  v_expira timestamptz;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if v.id is null or v.estado <> 'pendiente_pago' then
    raise exception 'estado_invalido';
  end if;
  v_faltan := public._inventario_faltantes(public._pedido_botellas(p_pedido), p_pedido);
  if jsonb_array_length(v_faltan) > 0 then
    raise exception 'sin_existencias' using detail = v_faltan::text;
  end if;
  v_expira := greatest(coalesce(v.reserva_expira_at, now()), now() + make_interval(mins => p_minutos));
  update public.pedidos set reserva_expira_at = v_expira, updated_at = now() where id = p_pedido;
  return v_expira;
end $$;
revoke all on function public.asegurar_apartado(uuid, integer) from public, anon, authenticated;
grant execute on function public.asegurar_apartado(uuid, integer) to service_role;

-- Correo al cliente cuando un pago que estaba en revisión no se aprobó (las botellas se liberan).
alter table public.correos_enviados drop constraint if exists correos_enviados_tipo_check;
alter table public.correos_enviados add constraint correos_enviados_tipo_check
  check (tipo in ('pedido_confirmado', 'pedido_enviado', 'pedido_entregado', 'pedido_equipo', 'pedido_pago_rechazado', 'quiz_perfil', 'guia', 'inventario_pocas', 'inventario_agotado'));
