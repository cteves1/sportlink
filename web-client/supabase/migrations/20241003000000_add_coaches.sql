-- Script para crear las cuentas de entrenadores en Supabase Auth y asignarles
-- el rol de entrenador en la app.
--
-- IMPORTANTE: este script inserta directamente en el schema auth de Supabase.
-- Ejecutarlo solo con el rol postgres/service_role en el SQL Editor.
-- La contraseña temporal es: TempPass123!
-- (cambiarla después del primer login si se desea).

-- 1. Inserta los usuarios en auth.users si no existen.
with new_users as (
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
  select
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    v.email,
    crypt('TempPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    v.meta,
    now(),
    now(),
    'authenticated',
    'authenticated'
  from (
    values
      ('cristianteves1@gmail.com', '{"name":"Cristian Teves"}'),
      ('fraanblasco2307@gmail.com', '{"name":"Francisco Blasco"}')
  ) as v(email, meta)
  where not exists (
    select 1 from auth.users u where u.email = v.email
  )
  returning id, email
),
existing_users as (
  select id, email
  from auth.users
  where email in (
    'cristianteves1@gmail.com',
    'fraanblasco2307@gmail.com'
  )
),
all_users as (
  select id, email from new_users
  union all
  select id, email from existing_users
),
-- 2. Inserta las identidades necesarias para login por email.
new_identities as (
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  select
    u.email,
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    now(),
    now()
  from all_users u
  where not exists (
    select 1
    from auth.identities i
    where i.provider_id = u.email and i.provider = 'email'
  )
  returning user_id
)
-- 3. Crea o actualiza el perfil con rol entrenador.
insert into public.profiles (id, role, athlete_id)
select u.id, 'entrenador', null
from all_users u
on conflict (id) do update set
  role = excluded.role,
  athlete_id = excluded.athlete_id;
