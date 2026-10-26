-- Precio "antes" (tachado) por vino. Opcional: si existe y es mayor que el precio final, la tienda lo muestra
-- tachado con el % de descuento calculado. Lo que se cobra sigue siendo precio_centavos (el servidor recalcula
-- siempre con la base). Solo lo edita un administrador desde el panel. Solo agrega una columna.

alter table public.productos add column if not exists precio_antes_centavos integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_precio_antes_mayor') then
    alter table public.productos add constraint productos_precio_antes_mayor
      check (precio_antes_centavos is null or precio_antes_centavos > precio_centavos);
  end if;
end $$;

-- La tienda (llave publicable) puede leerla, igual que el precio final.
grant select (precio_antes_centavos) on public.productos to anon, authenticated;
