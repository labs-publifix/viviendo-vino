-- Foto de cada kit prearmado, subida desde el panel (docs/ADMIN.md). Solo agrega una columna.
-- Si un kit no tiene foto aquí, la tienda usa la que ya tenía en el código (los 3 kits de hoy se ven igual).
-- La tienda ya puede leer toda la fila de los kits activos; no hace falta otro permiso.

alter table public.kits_prearmados add column if not exists imagen_url text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kits_prearmados_imagen_url_larga') then
    alter table public.kits_prearmados add constraint kits_prearmados_imagen_url_larga
      check (imagen_url is null or char_length(imagen_url) <= 500);
  end if;
end $$;
