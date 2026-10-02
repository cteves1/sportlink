-- Script de desarrollo: crea la tabla de pagos mensuales, inserta 10 jugadores
-- ficticios y genera pagos de ejemplo.
--
-- IMPORTANTE: este script está pensado para entornos de prueba. Ejecutarlo en
-- producción borrará los datos existentes de athletes y payments.

-- Tabla de pagos mensuales por jugador.
create table if not exists public.payments (
  id bigint generated always as identity primary key,
  athlete_id bigint not null references public.athletes(id) on delete cascade,
  year_month date not null, -- primer día del mes que corresponde el pago
  paid_at timestamptz,
  amount numeric,
  due_date date not null, -- vencimiento: día 10 del mes
  created_at timestamptz default now(),
  unique (athlete_id, year_month)
);

alter table public.payments enable row level security;

-- Limpia datos de prueba anteriores.
truncate table public.payments, public.athletes restart identity cascade;

-- Inserta 10 jugadores ficticios.
with inserted_athletes as (
  insert into public.athletes (
    first_name, last_name, category, status, player_type, phone,
    username, temp_password, attendance_rate, birth_date, dominant_hand,
    level, paddle_grip, rubber_forehand, rubber_backhand, playing_style,
    club, specific_goal, training_days, setup_completed, welcome_form_completed
  )
  values
    ('Juan', 'Pérez', 1, 'activo', 'regular', '1151111111', 'jperez', 'temp001', 92, '1998-03-15', 'derecha', 'avanzado', 'clasica', 'liso', 'liso', 'ofensivo', 'Club Central', 'Subir de categoría', array[1,3,5], true, true),
    ('María', 'González', 2, 'activo', 'regular', '1152222222', 'mgonzalez', 'temp002', 85, '2000-07-22', 'izquierda', 'intermedio', 'clasica', 'liso', 'pupo-corto', 'all-round', null, null, array[2,4], true, true),
    ('Carlos', 'Rodríguez', 3, 'activo', 'regular', '1153333333', 'crodriguez', 'temp003', 78, '1995-11-05', 'derecha', 'intermedio', 'lapicero', 'liso', 'liso', 'defensivo', null, null, array[1,3], true, true),
    ('Lucía', 'Martínez', 0, 'activo', 'regular', '1154444444', 'lmartinez', 'temp004', 95, '1997-01-30', 'derecha', 'avanzado', 'clasica', 'pupo-corto', 'liso', 'ofensivo', 'Club Central', 'Competir nacional', array[1,2,4,5], true, true),
    ('Mateo', 'Sánchez', 4, 'inactivo', 'regular', '1155555555', 'msanchez', 'temp005', 60, '2002-09-10', 'izquierda', 'principiante', 'clasica', null, null, null, null, null, array[6], true, false),
    ('Sofía', 'López', 5, 'activo', 'invitado', '1156666666', 'slopez', 'temp006', 88, '1999-05-18', 'derecha', 'intermedio', 'clasica', 'liso', 'liso', 'all-round', null, null, array[3,5], true, true),
    ('Tomás', 'Fernández', 6, 'activo', 'regular', '1157777777', 'tfernandez', 'temp007', 80, '2001-12-03', 'derecha', 'principiante', 'lapicero', null, null, null, null, null, array[2], true, false),
    ('Valentina', 'Silva', 7, 'activo', 'regular', '1158888888', 'vsilva', 'temp008', 73, '1996-08-25', 'izquierda', 'intermedio', 'clasica', 'liso', 'pupo-largo', 'bloqueador', null, null, array[1,4], true, true),
    ('Diego', 'Torres', 8, 'activo', 'regular', '1159999999', 'dtorres', 'temp009', 67, '2003-04-14', 'derecha', 'principiante', 'clasica', null, null, null, null, null, array[5], true, false),
    ('Camila', 'Ruiz', 9, 'activo', 'invitado', '1150000000', 'cruiz', 'temp010', 90, '2004-06-08', 'derecha', 'intermedio', 'clasica', 'liso', 'liso', 'ofensivo', null, null, array[2,6], true, true)
  returning id
)
select id from inserted_athletes;

-- Inserta pagos de ejemplo para los últimos 3 meses.
-- El vencimiento de cada mes es el día 10.
insert into public.payments (athlete_id, year_month, paid_at, amount, due_date)
select
  a.id,
  d.month_start,
  case
    when random() > 0.4 then d.month_start + (floor(random() * 15) + 1)::int -- pagó entre el 1 y el 15
    else null
  end,
  5000,
  d.month_start + 9
from public.athletes a
join lateral (
  select generate_series(
    date_trunc('month', now() - interval '2 months')::date,
    date_trunc('month', now())::date,
    interval '1 month'
  )::date as month_start
) d on true
order by a.id, d.month_start;

-- Fuerza algunos escenarios interesantes:
-- Jugador 1 (Juan Pérez): pagó el mes actual, puntual.
update public.payments
set paid_at = date_trunc('month', now())::date + 2,
    amount = 5000
where athlete_id = 1
  and year_month = date_trunc('month', now())::date;

-- Jugador 2 (María González): pagó el mes actual con 5 días de atraso.
update public.payments
set paid_at = date_trunc('month', now())::date + 15,
    amount = 5000
where athlete_id = 2
  and year_month = date_trunc('month', now())::date;

-- Jugador 3 (Carlos Rodríguez): no pagó el mes actual ni el anterior.
update public.payments
set paid_at = null
where athlete_id = 3
  and year_month >= date_trunc('month', now() - interval '1 month')::date;

-- Jugador 4 (Lucía Martínez): al día, pagó puntualmente los últimos 3 meses.
update public.payments
set paid_at = year_month + 5,
    amount = 5000
where athlete_id = 4;

-- Jugador 5 (Mateo Sánchez): no pagó ninguno de los últimos 3 meses (inactivo).
update public.payments
set paid_at = null
where athlete_id = 5;
