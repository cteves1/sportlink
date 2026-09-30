-- SportLink: datos para el flujo de primer login del jugador.

alter table public.athletes
  add column if not exists email text,
  add column if not exists setup_completed boolean not null default false;
