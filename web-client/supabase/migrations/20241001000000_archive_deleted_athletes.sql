-- Tabla de respaldo para atletas eliminados.
-- Ejecutar este script en el SQL Editor de Supabase para que el borrado
-- desde el frontend archive automáticamente el registro antes de eliminarlo.

create table if not exists public.deleted_athletes (
  id bigint primary key,
  user_id uuid,
  first_name text,
  last_name text,
  category int,
  status text,
  player_type text,
  phone text,
  email text,
  username text,
  temp_password text,
  attendance_rate int,
  birth_date date,
  dominant_hand text,
  level text,
  paddle_grip text,
  rubber_forehand text,
  rubber_backhand text,
  playing_style text,
  club text,
  specific_goal text,
  training_days int[],
  setup_completed boolean,
  welcome_form_completed boolean,
  welcome_form_answers jsonb,
  paid boolean,
  debt numeric,
  deleted_at timestamptz default now()
);

-- Habilitar RLS y permitir al service_role realizar operaciones (requerido para triggers).
alter table public.deleted_athletes enable row level security;

-- Función que copia un atleta a deleted_athletes antes del borrado.
create or replace function public.archive_deleted_athlete()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.deleted_athletes (
    id, user_id, first_name, last_name, category, status, player_type,
    phone, email, username, temp_password, attendance_rate, birth_date,
    dominant_hand, level, paddle_grip, rubber_forehand, rubber_backhand,
    playing_style, club, specific_goal, training_days, setup_completed,
    welcome_form_completed, welcome_form_answers, paid, debt
  ) values (
    old.id, old.user_id, old.first_name, old.last_name, old.category, old.status,
    old.player_type, old.phone, old.email, old.username, old.temp_password,
    old.attendance_rate, old.birth_date, old.dominant_hand, old.level,
    old.paddle_grip, old.rubber_forehand, old.rubber_backhand, old.playing_style,
    old.club, old.specific_goal, old.training_days, old.setup_completed,
    old.welcome_form_completed, old.welcome_form_answers, old.paid, old.debt
  );
  return old;
end;
$$;

-- Trigger que ejecuta la función antes de cada borrado en athletes.
drop trigger if exists archive_deleted_athlete_trigger on public.athletes;
create trigger archive_deleted_athlete_trigger
  before delete on public.athletes
  for each row
  execute function public.archive_deleted_athlete();
