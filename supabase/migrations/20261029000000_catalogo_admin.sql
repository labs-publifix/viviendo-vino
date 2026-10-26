-- Catálogo y aliados desde el panel (docs/ADMIN.md). No toca vinos, precios, grupos ni kits existentes.

-- 1. El aliado de Córdoba es la empresa In Vino Veritas (decisión del 27 oct 2026). La tienda no muestra este
--    nombre; solo cambia en el panel. El slug interno (aliado-cordoba) no cambia.
update public.aliados set nombre = 'In Vino Veritas' where slug = 'aliado-cordoba' and nombre = 'Aliado de Córdoba';

-- 2. La comisión y los datos del aliado no son públicos: la tienda (llave publicable) solo puede leer id, slug,
--    nombre y activo (lo que necesitan las políticas de grupos). Antes podía leer toda la fila.
revoke select on public.aliados from anon, authenticated;
grant select (id, slug, nombre, activo) on public.aliados to anon, authenticated;

-- 3. Datos privados del aliado (contacto y cuenta para transferencias). Solo el servidor los lee.
create table if not exists public.aliados_datos (
  aliado_id uuid primary key references public.aliados (id) on delete cascade,
  razon_social text check (razon_social is null or char_length(razon_social) <= 200),
  rfc text check (rfc is null or rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  contacto_nombre text check (contacto_nombre is null or char_length(contacto_nombre) <= 120),
  contacto_telefono text check (contacto_telefono is null or char_length(contacto_telefono) <= 30),
  contacto_email text check (contacto_email is null or char_length(contacto_email) <= 254),
  clabe text check (clabe is null or clabe ~ '^[0-9]{18}$'),
  notas text check (notas is null or char_length(notas) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.aliados_datos enable row level security;
revoke all on public.aliados_datos from anon, authenticated;

-- 4. Guardar las botellas de un kit prearmado en una sola transacción (la validación de 6 botellas del mismo
--    grupo corre al confirmar). Solo el servidor (secret key) la puede ejecutar.
create or replace function public.admin_guardar_kit_items(p_kit uuid, p_items jsonb) returns void
language plpgsql as $$
begin
  delete from public.kits_prearmados_items where kit_id = p_kit;
  insert into public.kits_prearmados_items (kit_id, producto_id, cantidad)
  select p_kit, (i->>'producto_id')::uuid, (i->>'cantidad')::integer
  from jsonb_array_elements(p_items) as i;
end $$;
revoke all on function public.admin_guardar_kit_items(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_guardar_kit_items(uuid, jsonb) to service_role;
