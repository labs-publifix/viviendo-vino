-- Registro de los correos de la secuencia (2 a 6) enviados a cada persona de la lista de espera.
-- La llave única (signup_id, step) garantiza que nadie reciba dos veces el mismo correo.

create table if not exists public.waitlist_email_sends (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.waitlist_signups (id) on delete cascade,
  step text not null,
  sent_at timestamptz not null default now(),
  constraint waitlist_email_sends_step_allowed check (step in ('e2', 'e3', 'e4', 'e5', 'e6')),
  constraint waitlist_email_sends_unique unique (signup_id, step)
);

create index if not exists waitlist_email_sends_step_idx on public.waitlist_email_sends (step);

alter table public.waitlist_email_sends enable row level security;

revoke all on public.waitlist_email_sends from anon, authenticated;

-- Marca de compra: la tienda la llenará cuando se pague un pedido con este correo.
-- Los correos 5 y 6 ("solo quien aún no compra") excluyen a quien la tenga.
alter table public.waitlist_signups add column if not exists purchased_at timestamptz;
