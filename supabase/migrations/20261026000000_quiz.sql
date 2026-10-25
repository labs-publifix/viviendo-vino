-- Quiz IA (/quiz). Todas las tablas con RLS activo y sin acceso para anon ni authenticated: solo el servidor
-- (secret key) lee y escribe. Sin datos personales salvo el correo opcional de quiz_saved_profiles.
-- Después de esta migración, corre supabase/seed/wine_profiles.sql (lo genera npm run quiz:seed).

-- Perfil de cada vino para el quiz. Fuente: wine-scan/knowledge/catalog-profiles.json (perfil, lista, grupo) y
-- quiz/config/vinos.json (aromas, ocasiones, platos, rol). Precio, foto y stock NO van aquí: salen de productos.
-- slug es el mismo de productos.slug (sin llave foránea para poder cargarla aunque el catálogo aún no exista).
create table if not exists public.wine_profiles (
  slug text primary key,
  nombre text not null,
  lista smallint not null check (lista between 1 and 4),
  grupo text not null check (grupo in ('tinto', 'blanco', 'rosado', 'espumoso')),
  cuerpo smallint not null check (cuerpo between 1 and 5),
  acidez smallint not null check (acidez between 1 and 5),
  tanino smallint not null check (tanino between 0 and 5),
  dulzor smallint not null check (dulzor between 1 and 5),
  intensidad smallint not null check (intensidad between 1 and 5),
  familias_aromaticas text[] not null default '{}',
  ocasiones text[] not null default '{}',
  platos text[] not null default '{}',
  rol_kit text not null check (rol_kit in ('basico', 'descubrimiento', 'especial')),
  perfil_confianza text not null default 'media' check (perfil_confianza in ('alta', 'media', 'baja')),
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Un quiz completado. respuestas y kit son lo que decidió el código; narrativa es el texto que se mostró.
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid,
  respuestas jsonb not null,
  comentario text check (comentario is null or char_length(comentario) <= 280),
  restricciones jsonb,
  perfil text not null,
  kit jsonb,
  kit_alterno jsonb,
  prearmado text,
  avisos jsonb not null default '[]',
  narrativa jsonb,
  ocasion text not null,
  presupuesto text not null,
  origen text check (origen is null or char_length(origen) <= 40),
  repeticion boolean not null default false,
  agrego_carrito boolean not null default false,
  agrego_carrito_at timestamptz,
  compartido smallint not null default 0,
  correo_guardado boolean not null default false,
  modelo text,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  tokens_cache integer not null default 0,
  tokens_cache_escritura integer not null default 0,
  latencia_ms integer,
  texto_prearmado boolean not null default false,
  narrativa_en_cache boolean not null default false
);
create index if not exists quiz_sessions_created_idx on public.quiz_sessions (created_at desc);
create index if not exists quiz_sessions_session_idx on public.quiz_sessions (session_id, created_at);

-- Caché de textos generados por combinación (respuestas + kit). Los quizzes con comentario libre no se guardan aquí.
create table if not exists public.quiz_narratives (
  hash text primary key check (char_length(hash) = 64),
  created_at timestamptz not null default now(),
  perfil text not null,
  narrativa jsonb not null,
  modelo text not null,
  usos integer not null default 0,
  ultimo_uso timestamptz
);

-- Eventos de la interfaz para el embudo (sin datos personales).
create table if not exists public.quiz_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id uuid,
  quiz_id uuid references public.quiz_sessions (id) on delete cascade,
  tipo text not null check (tipo in ('inicio', 'pregunta', 'comentario', 'resultado', 'compartido', 'copiado', 'tarjeta', 'carrito', 'prearmado', 'segundo_kit', 'guardar', 'repetir', 'repetir_perfil', 'visita_compartida')),
  pregunta smallint check (pregunta is null or pregunta between 1 and 9),
  origen text check (origen is null or char_length(origen) <= 40)
);
create index if not exists quiz_events_created_idx on public.quiz_events (created_at desc);
create index if not exists quiz_events_tipo_idx on public.quiz_events (tipo, created_at);

-- Correo opcional para guardar el perfil (se pide solo después del resultado).
create table if not exists public.quiz_saved_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  quiz_id uuid not null references public.quiz_sessions (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  marketing_consent boolean not null default false,
  sent_at timestamptz
);
create index if not exists quiz_saved_profiles_email_idx on public.quiz_saved_profiles (lower(email), created_at desc);

-- Calificación de cada vino tras la compra (estructura lista; el correo de seguimiento llega en diciembre).
create table if not exists public.quiz_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  quiz_id uuid references public.quiz_sessions (id) on delete set null,
  pedido_id text,
  slug text not null,
  calificacion smallint not null check (calificacion in (1, 0, -1)),
  era_reto boolean not null default false
);
create index if not exists quiz_feedback_quiz_idx on public.quiz_feedback (quiz_id);

alter table public.wine_profiles enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_narratives enable row level security;
alter table public.quiz_events enable row level security;
alter table public.quiz_saved_profiles enable row level security;
alter table public.quiz_feedback enable row level security;
revoke all on public.wine_profiles, public.quiz_sessions, public.quiz_narratives, public.quiz_events, public.quiz_saved_profiles, public.quiz_feedback from anon, authenticated;

-- Métricas por día para revisar en el SQL Editor: select * from public.quiz_metricas;
-- costo_usd_aprox usa el precio de Claude Sonnet 5.5 (2 / 10 / 0.20 / 4 USD por millón de tokens: entrada,
-- salida, lectura y escritura de caché de 1 h). Si cambias QUIZ_MODEL, ajusta los factores.
create or replace view public.quiz_metricas
with (security_invoker = true) as
with dias as (
  select date_trunc('day', created_at at time zone 'America/Mexico_City')::date as dia, * from public.quiz_sessions
),
eventos as (
  select date_trunc('day', created_at at time zone 'America/Mexico_City')::date as dia, * from public.quiz_events
)
select
  d.dia,
  (select count(distinct coalesce(e.session_id::text, e.id::text)) from eventos e where e.dia = d.dia and e.tipo = 'inicio') as inicios,
  count(*) as completados,
  round(100.0 * count(*) / nullif((select count(distinct coalesce(e.session_id::text, e.id::text)) from eventos e where e.dia = d.dia and e.tipo = 'inicio'), 0), 1) as pct_inicio_a_final,
  count(*) filter (where d.agrego_carrito) as agregaron_al_carrito,
  round(100.0 * count(*) filter (where d.agrego_carrito) / nullif(count(*), 0), 1) as pct_resultado_a_carrito,
  sum(d.compartido) as compartidos,
  count(*) filter (where d.correo_guardado) as correos_guardados,
  count(*) filter (where d.repeticion) as repeticiones_con_perfil_guardado,
  count(*) filter (where d.comentario is not null) as con_comentario,
  count(*) filter (where d.texto_prearmado) as con_texto_prearmado,
  count(*) filter (where d.narrativa_en_cache) as con_texto_en_cache,
  round(avg(d.latencia_ms)) as latencia_ms_promedio,
  percentile_disc(0.95) within group (order by d.latencia_ms) as latencia_ms_p95,
  sum(d.tokens_entrada) as tokens_entrada,
  sum(d.tokens_salida) as tokens_salida,
  sum(d.tokens_cache) as tokens_cache,
  sum(d.tokens_cache_escritura) as tokens_cache_escritura,
  round((sum(d.tokens_entrada) * 2 + sum(d.tokens_salida) * 10 + sum(d.tokens_cache) * 0.2 + sum(d.tokens_cache_escritura) * 4) / 1e6, 4) as costo_usd_aprox
from dias d
group by d.dia
order by d.dia desc;

-- Abandono por pregunta: cuántas sesiones vieron cada pregunta (la 9 es el comentario libre).
create or replace view public.quiz_abandono
with (security_invoker = true) as
select pregunta, count(distinct session_id) as sesiones
from public.quiz_events
where tipo = 'pregunta' and created_at > now() - interval '30 days'
group by pregunta
order by pregunta;

-- Qué perfiles salen más (últimos 30 días) y cuántos agregan su kit al carrito.
create or replace view public.quiz_perfiles
with (security_invoker = true) as
select perfil, count(*) as quizzes, count(*) filter (where agrego_carrito) as agregaron_al_carrito
from public.quiz_sessions
where created_at > now() - interval '30 days'
group by perfil
order by quizzes desc;

-- Repeticiones: navegadores que hicieron el quiz más de una vez en 30 días.
create or replace view public.quiz_repeticiones
with (security_invoker = true) as
select count(*) as navegadores, count(*) filter (where veces > 1) as repitieron
from (
  select session_id, count(*) as veces from public.quiz_sessions
  where session_id is not null and created_at > now() - interval '30 days'
  group by session_id
) s;

revoke all on public.quiz_metricas, public.quiz_abandono, public.quiz_perfiles, public.quiz_repeticiones from anon, authenticated;

-- Compra del kit con o sin edición: el carrito marca el kit del quiz como "quiz:<id>" y la marca se pierde si la
-- persona cambia una botella en el armador. Cuando exista la tabla de pedidos, un kit con esa marca es un kit
-- comprado sin editar.
