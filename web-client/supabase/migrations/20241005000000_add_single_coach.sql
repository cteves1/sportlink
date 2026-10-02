-- Crea la cuenta de entrenador para Cristian Teves si no existe.
-- La contraseña temporal es: TempPass123!
--
-- Ejecutar con el rol postgres/service_role en el SQL Editor de Supabase.

with new_user as (
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
    'cristianteves1@gmail.com',
    crypt('TempPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
  where not exists (
    select 1 from auth.users where email = 'cristianteves1@gmail.com'
  )
  returning id, email
),
existing_user as (
  select id, email
  from auth.users
  where email = 'cristianteves1@gmail.com'
),
all_users as (
  select id, email from new_user
  union all
  select id, email from existing_user
),
new_identity as (
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
insert into public.profiles (id, role, athlete_id)
select u.id, 'entrenador', null
from all_users u
on conflict (id) do update set
  role = excluded.role,
  athlete_id = excluded.athlete_id;
