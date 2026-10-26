-- Marquesina de la tienda, editable desde /admin/anuncios (docs/ADMIN.md). Solo agrega una tabla.
-- La tienda lee con la llave publicable: RLS deja ver solo los mensajes encendidos (las fechas se revisan en el
-- servidor). Escribe solo el panel, con la secret key.

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  texto text not null check (char_length(texto) between 3 and 90),
  enlace text check (enlace is null or (char_length(enlace) <= 300 and (enlace like '/%' or enlace like 'https://%'))),
  orden integer not null default 0,
  activo boolean not null default true,
  inicia_at timestamptz,
  termina_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anuncios_ventana check (inicia_at is null or termina_at is null or termina_at > inicia_at)
);
create index if not exists anuncios_orden_idx on public.anuncios (orden);

alter table public.anuncios enable row level security;
revoke all on public.anuncios from anon, authenticated;
grant select on public.anuncios to anon, authenticated;
drop policy if exists "anuncios encendidos" on public.anuncios;
create policy "anuncios encendidos" on public.anuncios for select to anon, authenticated using (activo);

-- Los mensajes que hoy están fijos en el código, en el mismo orden. Solo si la tabla está vacía.
insert into public.anuncios (texto, enlace, orden)
select t.texto, t.enlace, t.orden
from (values
  ('Kits de 6 botellas con envío incluido', null, 1),
  ('Arma tu kit desde $1,800', null, 2),
  ('Vino italiano de Véneto, Piamonte, Abruzzo y Puglia', null, 3),
  ('Repite las botellas que quieras', null, 4),
  ('Cómo funciona', '/#como-funciona', 5)
) as t(texto, enlace, orden)
where not exists (select 1 from public.anuncios);
