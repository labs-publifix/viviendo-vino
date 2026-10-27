-- Registro de correos enviados (docs/ADMIN.md): pedidos (cliente y equipo) y contenido (perfil del quiz y guías
-- del blog). "enviado" = Resend lo aceptó; aún no sabemos si llegó o se abrió (se puede sumar después con los
-- avisos de Resend). Solo agrega una tabla. RLS activo y sin acceso público: solo el servidor lee y escribe.

create table if not exists public.correos_enviados (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('pedido_confirmado', 'pedido_enviado', 'pedido_entregado', 'pedido_equipo', 'quiz_perfil', 'guia')),
  para text not null check (para in ('cliente', 'equipo')),
  pedido_id uuid references public.pedidos (id) on delete cascade,
  referencia text check (referencia is null or char_length(referencia) <= 120),
  destinatario text not null check (char_length(destinatario) <= 254),
  asunto text not null check (char_length(asunto) <= 200),
  estado text not null check (estado in ('enviado', 'fallo')),
  proveedor_id text check (proveedor_id is null or char_length(proveedor_id) <= 120),
  error text check (error is null or char_length(error) <= 120),
  reenvio boolean not null default false,
  usuario_id uuid references public.admin_usuarios (id) on delete set null
);
create index if not exists correos_enviados_created_idx on public.correos_enviados (created_at desc);
create index if not exists correos_enviados_pedido_idx on public.correos_enviados (pedido_id, created_at);

alter table public.correos_enviados enable row level security;
revoke all on public.correos_enviados from anon, authenticated;
