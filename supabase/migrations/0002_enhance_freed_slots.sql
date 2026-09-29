-- SportLink: enriquece la tabla de cupos liberados para soportar el flujo de avisos.

-- Agrega los datos denormalizados que el frontend necesita para mostrar la notificación
-- sin tener que hacer joins adicionales en cada lectura.
alter table public.freed_slots
  add column if not exists attendance_id int references public.session_attendances(id) on delete set null,
  add column if not exists player_name text,
  add column if not exists session_date date,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists shift_label text,
  add column if not exists status text default 'pendiente',
  add column if not exists notified_player_ids int[] default '{}',
  add column if not exists notified_at timestamptz;

-- Tipo enum para el estado del aviso.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'freed_slot_status') then
    create type public.freed_slot_status as enum ('pendiente', 'avisado', 'descartado');
  end if;
end $$;

-- Convierte la columna de texto al enum. Si ya tenía valores inválidos, fallará: corregirlos primero.
alter table public.freed_slots
  alter column status type public.freed_slot_status using status::public.freed_slot_status;

-- Valor por defecto explícito.
alter table public.freed_slots
  alter column status set default 'pendiente';

-- Reemplaza el trigger que gestiona freed_slots para que cargue los datos enriquecidos.
create or replace function public.manage_freed_slots()
returns trigger
language plpgsql
as $$
declare
  session_record public.training_sessions%rowtype;
  athlete_record public.athletes%rowtype;
begin
  -- Cancelación: de confirmado pasa a ausente
  if old.status = 'confirmado' and new.status = 'ausente' then
    select * into session_record from public.training_sessions where id = new.session_id;
    select * into athlete_record from public.athletes where id = new.athlete_id;

    insert into public.freed_slots (
      session_id,
      attendance_id,
      athlete_id,
      player_name,
      session_date,
      start_time,
      end_time,
      shift_label,
      status,
      notified_player_ids,
      notified_at
    )
    values (
      new.session_id,
      new.id,
      new.athlete_id,
      coalesce(athlete_record.first_name || ' ' || athlete_record.last_name, 'Jugador'),
      session_record.session_date,
      session_record.start_time,
      session_record.end_time,
      session_record.shift_label,
      'pendiente',
      '{}',
      null
    )
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

-- Asegura que los entrenadores/admins puedan actualizar el estado de los avisos.
create policy "Entrenadores y admins actualizan cupos liberados"
  on public.freed_slots for update
  using (public.is_coach_or_admin());
