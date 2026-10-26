-- Panel de administración (/admin): equipo, sesiones, intentos de acceso y auditoría. Plan: docs/ADMIN.md.
-- RLS activo y sin acceso para anon ni authenticated: solo el servidor (secret key) lee y escribe.
-- Solo agrega tablas; no toca el catálogo existente.

-- Equipo del panel. user_id se llena cuando la persona crea su contraseña (Supabase Auth).
create table if not exists public.admin_usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  nombre text not null check (char_length(nombre) between 1 and 120),
  rol text not null check (rol in ('admin', 'aliado', 'atencion')),
  aliado_id uuid references public.aliados (id),
  user_id uuid unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  ultimo_acceso timestamptz,
  constraint admin_usuarios_aliado check (rol <> 'aliado' or aliado_id is not null)
);

-- Sesiones del panel: solo el hash del token de la cookie vv_admin (el token nunca se guarda).
create table if not exists public.admin_sesiones (
  token_hash text primary key check (char_length(token_hash) = 64),
  usuario_id uuid not null references public.admin_usuarios (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists admin_sesiones_usuario_idx on public.admin_sesiones (usuario_id);

-- Intentos de acceso, para bloquear tras varios fallos. Correo como hash: no se guardan correos ajenos.
create table if not exists public.admin_intentos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email_hash text not null check (char_length(email_hash) = 64),
  exito boolean not null
);
create index if not exists admin_intentos_email_idx on public.admin_intentos (email_hash, created_at desc);

-- Auditoría: quién cambió qué, cuándo, y el valor anterior y nuevo (Fundamentos P-08).
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  usuario_id uuid references public.admin_usuarios (id) on delete set null,
  usuario_email text,
  accion text not null check (char_length(accion) <= 60),
  entidad text not null check (char_length(entidad) <= 60),
  entidad_id text,
  antes jsonb,
  despues jsonb
);
create index if not exists auditoria_created_idx on public.auditoria (created_at desc);
create index if not exists auditoria_entidad_idx on public.auditoria (entidad, entidad_id);

alter table public.admin_usuarios enable row level security;
alter table public.admin_sesiones enable row level security;
alter table public.admin_intentos enable row level security;
alter table public.auditoria enable row level security;
revoke all on public.admin_usuarios, public.admin_sesiones, public.admin_intentos, public.auditoria from anon, authenticated;

-- Equipo inicial (docs/ADMIN.md). Cada quien crea su contraseña desde /admin/recuperar.
insert into public.admin_usuarios (email, nombre, rol) values
  ('raguirre@continentalmedia.com.mx', 'Rafael Aguirre', 'admin'),
  ('labs.publifix@gmail.com', 'José Bermúdez', 'admin')
on conflict (email) do nothing;

-- Fotos de vino que se suben desde el panel (las 19 actuales siguen en public/img/vinos/).
-- Bucket público de solo lectura; solo el servidor sube.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vinos', 'vinos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
