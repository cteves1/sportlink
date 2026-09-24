-- SportLink: esquema inicial para Supabase
-- Tablas, tipos, funciones, triggers y políticas RLS.

-- ------------------------------------------------------------------
-- Tipos enumerados
-- ------------------------------------------------------------------

create type public.user_role as enum ('entrenador', 'admin', 'jugador');
create type public.player_level as enum ('principiante', 'intermedio', 'avanzado');
create type public.paddle_grip as enum ('clasica', 'lapicero');
create type public.rubber_type as enum ('liso', 'pupo-corto', 'pupo-largo', 'antitopspin');
create type public.playing_style as enum ('ofensivo', 'defensivo', 'all-round', 'bloqueador');
create type public.athlete_status as enum ('activo', 'inactivo');
create type public.player_type as enum ('regular', 'invitado');
create type public.dominant_hand as enum ('derecha', 'izquierda');
create type public.attendance_status as enum ('confirmado', 'ausente');
create type public.presence_status as enum ('presente', 'ausente');
create type public.years_playing as enum ('menos-de-1', '1-a-3', '3-a-5', 'mas-de-5');
create type public.main_goal as enum ('competir', 'mejorar-tecnica', 'socializar', 'mantenerse-en-forma', 'otro');

-- ------------------------------------------------------------------
-- Helper: ¿el usuario actual es entrenador o admin?
-- ------------------------------------------------------------------

create or replace function public.is_coach_or_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('entrenador', 'admin')
  );
$$;

-- ------------------------------------------------------------------
-- Perfiles: extienden auth.users con el rol del negocio
-- ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.user_role not null default 'jugador',
  athlete_id int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de negocio vinculado a auth.users. Un jugador puede estar ligado a un athlete.';

-- ------------------------------------------------------------------
-- Atletas / jugadores
-- ------------------------------------------------------------------

create table public.athletes (
  id serial primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  birth_date date,
  phone text,
  category smallint not null check (category between 0 and 9),
  status public.athlete_status not null default 'activo',
  player_type public.player_type not null default 'regular',
  dominant_hand public.dominant_hand not null,
  level public.player_level not null,
  paddle_grip public.paddle_grip,
  rubber_forehand public.rubber_type,
  rubber_backhand public.rubber_type,
  playing_style public.playing_style,
  club text,
  specific_goal text,
  training_days smallint[] not null default '{}',
  attendance_rate numeric(5, 2) not null default 0,
  welcome_form_completed boolean not null default false,
  username text unique,
  temp_password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.athletes is 'Ficha técnica y personal del jugador. Puede existir sin user_id hasta que el jugador se registra.';

-- Vinculación inversa desde profiles
alter table public.profiles
  add constraint fk_profile_athlete
  foreign key (athlete_id) references public.athletes(id) on delete set null;

-- ------------------------------------------------------------------
-- Formulario de bienvenida
-- ------------------------------------------------------------------

create table public.welcome_form_answers (
  id serial primary key,
  athlete_id int not null unique references public.athletes(id) on delete cascade,
  main_goal public.main_goal not null,
  short_term_goal text,
  long_term_goal text,
  motivation text,
  coach_support text,
  years_playing public.years_playing not null,
  has_competed boolean not null default false,
  self_perceived_level public.player_level not null,
  paddle_grip public.paddle_grip,
  rubber_forehand public.rubber_type,
  rubber_backhand public.rubber_type,
  playing_style public.playing_style,
  club text,
  specific_goal text,
  training_days smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Plantillas de turnos (configuración del entrenador)
-- ------------------------------------------------------------------

create table public.shift_templates (
  id serial primary key,
  label text not null,
  start_time time not null,
  end_time time not null,
  capacity int check (capacity is null or capacity > 0),
  weekdays smallint[] not null check (array_length(weekdays, 1) > 0),
  player_ids int[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_weekdays check (
    weekdays <@ array[1, 2, 3, 4, 5, 6, 7]
  )
);

-- ------------------------------------------------------------------
-- Sesiones de entrenamiento concretas (materializadas a partir de plantillas o puntuales)
-- ------------------------------------------------------------------

create table public.training_sessions (
  id serial primary key,
  session_date date not null,
  shift_label text not null,
  start_time time not null,
  end_time time not null,
  capacity int check (capacity is null or capacity > 0),
  template_id int references public.shift_templates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Asistencias de una sesión
-- ------------------------------------------------------------------

create table public.session_attendances (
  id serial primary key,
  session_id int not null references public.training_sessions(id) on delete cascade,
  athlete_id int not null references public.athletes(id) on delete cascade,
  status public.attendance_status not null default 'confirmado',
  presence public.presence_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, athlete_id)
);

-- ------------------------------------------------------------------
-- Cupos liberados (para notificaciones realtime)
-- ------------------------------------------------------------------

create table public.freed_slots (
  id serial primary key,
  session_id int not null references public.training_sessions(id) on delete cascade,
  athlete_id int not null references public.athletes(id) on delete cascade,
  freed_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Triggers: creación automática de perfil al registrar usuario
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'jugador')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Importante: el trigger se crea en el schema auth sobre auth.users.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- Triggers: validación de capacidad de un turno
-- ------------------------------------------------------------------

create or replace function public.check_session_capacity()
returns trigger
language plpgsql
as $$
declare
  session_capacity int;
  confirmed_count int;
begin
  -- Si la asistencia pasa a confirmado, controlamos cupo.
  if new.status = 'confirmado' then
    select capacity into session_capacity
    from public.training_sessions
    where id = new.session_id;

    if session_capacity is not null then
      select count(*) into confirmed_count
      from public.session_attendances
      where session_id = new.session_id
        and status = 'confirmado'
        and id <> coalesce(new.id, 0);

      if confirmed_count >= session_capacity then
        raise exception 'El turno no tiene cupos disponibles';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_check_session_capacity
  before insert or update on public.session_attendances
  for each row execute function public.check_session_capacity();

-- ------------------------------------------------------------------
-- Triggers: registrar y limpiar cupos liberados
-- ------------------------------------------------------------------

create or replace function public.manage_freed_slots()
returns trigger
language plpgsql
as $$
begin
  -- Cancelación: de confirmado pasa a ausente
  if old.status = 'confirmado' and new.status = 'ausente' then
    insert into public.freed_slots (session_id, athlete_id)
    values (new.session_id, new.athlete_id)
    on conflict do nothing;
  end if;

  -- Reversión: de ausente vuelve a confirmado
  if old.status = 'ausente' and new.status = 'confirmado' then
    delete from public.freed_slots
    where session_id = new.session_id and athlete_id = new.athlete_id;
  end if;

  return new;
end;
$$;

create trigger trg_manage_freed_slots
  after update on public.session_attendances
  for each row execute function public.manage_freed_slots();

-- ------------------------------------------------------------------
-- Trigger: al completar formulario de bienvenida, marcar athlete.welcome_form_completed
-- ------------------------------------------------------------------

create or replace function public.mark_welcome_form_completed()
returns trigger
language plpgsql
as $$
begin
  update public.athletes
  set welcome_form_completed = true,
      level = new.self_perceived_level,
      paddle_grip = new.paddle_grip,
      rubber_forehand = new.rubber_forehand,
      rubber_backhand = new.rubber_backhand,
      playing_style = new.playing_style,
      club = new.club,
      specific_goal = new.specific_goal,
      training_days = case
        when array_length(coalesce((select training_days from public.athletes where id = new.athlete_id), '{}'), 1) > 0
        then (select training_days from public.athletes where id = new.athlete_id)
        else new.training_days
      end,
      updated_at = now()
  where id = new.athlete_id;

  return new;
end;
$$;

create trigger trg_welcome_form_completed
  after insert or update on public.welcome_form_answers
  for each row execute function public.mark_welcome_form_completed();

-- ------------------------------------------------------------------
-- Actualización automática de updated_at
-- ------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles for each row execute function public.set_updated_at();

create trigger trg_athletes_updated_at
  before update on public.athletes for each row execute function public.set_updated_at();

create trigger trg_welcome_forms_updated_at
  before update on public.welcome_form_answers for each row execute function public.set_updated_at();

create trigger trg_shift_templates_updated_at
  before update on public.shift_templates for each row execute function public.set_updated_at();

create trigger trg_training_sessions_updated_at
  before update on public.training_sessions for each row execute function public.set_updated_at();

create trigger trg_session_attendances_updated_at
  before update on public.session_attendances for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.athletes enable row level security;
alter table public.welcome_form_answers enable row level security;
alter table public.shift_templates enable row level security;
alter table public.training_sessions enable row level security;
alter table public.session_attendances enable row level security;
alter table public.freed_slots enable row level security;

-- Profiles

create policy "Usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_coach_or_admin());

create policy "Entrenadores y admins gestionan perfiles"
  on public.profiles for all
  using (public.is_coach_or_admin());

create policy "Jugadores actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Athletes

create policy "Entrenadores y admins gestionan atletas"
  on public.athletes for all
  using (public.is_coach_or_admin());

create policy "Jugadores ven y actualizan su propia ficha"
  on public.athletes for select
  using (
    auth.uid() in (
      select user_id from public.athletes where id = athletes.id
    )
    or
    id = (select athlete_id from public.profiles where id = auth.uid())
  );

create policy "Jugadores actualizan su propia ficha (limitado)"
  on public.athletes for update
  using (auth.uid() in (select user_id from public.athletes where id = athletes.id));

-- Welcome form answers

create policy "Entrenadores y admins gestionan formularios"
  on public.welcome_form_answers for all
  using (public.is_coach_or_admin());

create policy "Jugadores ven y completan su propio formulario"
  on public.welcome_form_answers for all
  using (
    athlete_id = (select athlete_id from public.profiles where id = auth.uid())
    or auth.uid() in (select user_id from public.athletes where id = welcome_form_answers.athlete_id)
  );

-- Shift templates

create policy "Entrenadores y admins gestionan plantillas"
  on public.shift_templates for all
  using (public.is_coach_or_admin());

create policy "Cualquier usuario autenticado ve plantillas"
  on public.shift_templates for select
  using (auth.role() = 'authenticated');

-- Training sessions

create policy "Entrenadores y admins gestionan sesiones"
  on public.training_sessions for all
  using (public.is_coach_or_admin());

create policy "Cualquier usuario autenticado ve sesiones"
  on public.training_sessions for select
  using (auth.role() = 'authenticated');

-- Session attendances

create policy "Entrenadores y admins gestionan asistencias"
  on public.session_attendances for all
  using (public.is_coach_or_admin());

create policy "Jugadores ven sus propias asistencias"
  on public.session_attendances for select
  using (
    athlete_id = (select athlete_id from public.profiles where id = auth.uid())
    or auth.uid() in (select user_id from public.athletes where id = session_attendances.athlete_id)
  );

create policy "Jugadores reservan/cancelan su propia asistencia"
  on public.session_attendances for insert
  with check (
    athlete_id = (select athlete_id from public.profiles where id = auth.uid())
    or auth.uid() in (select user_id from public.athletes where id = session_attendances.athlete_id)
  );

create policy "Jugadores actualizan su propia asistencia"
  on public.session_attendances for update
  using (
    athlete_id = (select athlete_id from public.profiles where id = auth.uid())
    or auth.uid() in (select user_id from public.athletes where id = session_attendances.athlete_id)
  );

-- Freed slots

create policy "Entrenadores y admins gestionan cupos liberados"
  on public.freed_slots for all
  using (public.is_coach_or_admin());

create policy "Cualquier usuario autenticado ve cupos liberados"
  on public.freed_slots for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------------

-- Las inserciones en freed_slots disparan notificaciones para los clientes suscritos.
alter publication supabase_realtime add table public.freed_slots;
