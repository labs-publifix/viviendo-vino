-- Lista de espera de Viviendo Vino.
-- Solo el servidor (con la secret key) lee y escribe: RLS activo y sin políticas públicas.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  wine_types text[] not null default '{}',
  source text,
  consent boolean not null default true,
  consent_at timestamptz default now(),
  created_at timestamptz default now(),
  confirmation_sent_at timestamptz,
  unsubscribed_at timestamptz,
  constraint waitlist_signups_email_normalized check (email = lower(btrim(email)) and email <> ''),
  constraint waitlist_signups_wine_types_allowed check (
    wine_types <@ array['blancos', 'rosado', 'tintos', 'prosecco', 'todo']::text[]
  ),
  constraint waitlist_signups_source_length check (source is null or char_length(source) <= 40)
);

create unique index if not exists waitlist_signups_email_key on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

-- Sin políticas: anon y authenticated no pueden leer ni escribir.
revoke all on public.waitlist_signups from anon, authenticated;
