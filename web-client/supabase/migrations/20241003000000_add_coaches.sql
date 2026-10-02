-- Script para crear las cuentas de entrenadores en Supabase Auth y asignarles
-- el rol de entrenador en la app.
--
-- IMPORTANTE: este script inserta directamente en el schema auth de Supabase.
-- Ejecutarlo solo con el rol postgres/service_role en el SQL Editor.
-- La contraseña temporal es: TempPass123!
-- (cambiarla después del primer login si se desea).

with coaches as (
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  )
  values (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'cristianteves1@gmail.com',
    crypt('TempPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Cristian Teves"}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  ), (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'fraanblasco2307@gmail.com',
    crypt('TempPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Francisco Blasco"}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
  on conflict (email) do update set
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now()
  returning id, email
),
identities as (
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  select
    c.email,
    c.id,
    jsonb_build_object('sub', c.id::text, 'email', c.email),
    'email',
    now(),
    now()
  from coaches c
  on conflict (provider_id, provider) do update set
    identity_data = excluded.identity_data,
    updated_at = now()
  returning user_id
)
insert into public.profiles (id, role, athlete_id)
select i.user_id, 'entrenador', null
from identities i
on conflict (id) do update set
  role = excluded.role,
  athlete_id = excluded.athlete_id;
