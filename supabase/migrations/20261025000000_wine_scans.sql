-- Wine Scan: un registro por escaneo, sin la foto y sin la IP. Solo el servidor (secret key) lee y escribe.
-- session_id es un identificador anónimo del navegador (no se liga a una persona).

create table if not exists public.wine_scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid,
  vino_detectado text,
  grupo text,
  confianza text,
  accion text not null,
  resultado jsonb,
  slug_recomendado text,
  similitud numeric(4, 3),
  modelo text not null,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  tokens_cache integer not null default 0,
  tokens_cache_escritura integer not null default 0,
  latencia_ms integer,
  feedback smallint,
  constraint wine_scans_feedback_valido check (feedback is null or feedback in (1, -1)),
  constraint wine_scans_confianza_valida check (confianza is null or confianza in ('alta', 'media', 'baja')),
  constraint wine_scans_vino_largo check (vino_detectado is null or char_length(vino_detectado) <= 300)
);

create index if not exists wine_scans_created_idx on public.wine_scans (created_at desc);
create index if not exists wine_scans_vino_idx on public.wine_scans (lower(vino_detectado));

alter table public.wine_scans enable row level security;
revoke all on public.wine_scans from anon, authenticated;

-- Resumen por día para revisar en el SQL Editor: select * from public.wine_scans_resumen;
-- tokens_* sirven para estimar costo (precio por millón de tokens del modelo de cada fila).
create or replace view public.wine_scans_resumen
with (security_invoker = true) as
select
  date_trunc('day', created_at at time zone 'America/Mexico_City')::date as dia,
  count(*) as escaneos,
  count(*) filter (where accion = 'ok') as guias,
  round(100.0 * count(*) filter (where accion = 'pedir_otra_foto') / nullif(count(*), 0), 1) as pct_pedir_otra_foto,
  round(100.0 * count(*) filter (where accion = 'no_es_vino') / nullif(count(*), 0), 1) as pct_no_es_vino,
  round(100.0 * count(*) filter (where accion like 'error:%') / nullif(count(*), 0), 1) as pct_error,
  round(100.0 * count(*) filter (where slug_recomendado is not null) / nullif(count(*) filter (where accion = 'ok'), 0), 1) as pct_con_recomendacion,
  count(*) filter (where feedback = 1) as me_sirvio,
  count(*) filter (where feedback = -1) as no_me_sirvio,
  sum(tokens_entrada) as tokens_entrada,
  sum(tokens_salida) as tokens_salida,
  sum(tokens_cache) as tokens_cache,
  sum(tokens_cache_escritura) as tokens_cache_escritura,
  round(avg(latencia_ms)) as latencia_ms_promedio
from public.wine_scans
group by 1
order by 1 desc;

revoke all on public.wine_scans_resumen from anon, authenticated;

-- Vinos más escaneados (consulta, no vista):
-- select lower(vino_detectado) as vino, count(*) from public.wine_scans
-- where accion = 'ok' group by 1 order by 2 desc limit 20;
