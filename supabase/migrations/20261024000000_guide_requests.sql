-- Solicitudes de guías en PDF desde el blog (/blog/<slug>, botón "Descargar guía").
-- Solo el servidor escribe aquí (secret key); el navegador no tiene acceso.
-- marketing_consent: la persona marcó "quiero recibir novedades"; en ese caso también se agrega
-- a waitlist_signups (la lista de correos) con source = 'guia:<slug>' (recortado a 40 caracteres).

create table if not exists public.guide_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  guide_slug text not null,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint guide_requests_email_format check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and length(email) <= 254),
  constraint guide_requests_slug_format check (guide_slug ~ '^[a-z0-9-]{1,120}$')
);

-- Para limitar reenvíos al mismo correo en poco tiempo.
create index if not exists guide_requests_email_created_idx on public.guide_requests (email, created_at desc);

alter table public.guide_requests enable row level security;

revoke all on public.guide_requests from anon, authenticated;
