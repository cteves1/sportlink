-- Arregla el usuario de entrenador creado manualmente para que pueda iniciar sesión.
-- El error "Database error querying schema" suele deberse a que auth.users tiene
-- columnas de token en NULL, que GoTrue espera como cadenas vacías.
--
-- Ejecutar con el rol postgres/service_role en el SQL Editor de Supabase.

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  recovery_token = coalesce(recovery_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
where email = 'Fraanblasco2307@gmail.com';

-- También nos aseguramos de que la identidad esté bien formada (provider_id = email, identity_data con sub y email).
update auth.identities
set
  provider_id = 'Fraanblasco2307@gmail.com',
  identity_data = jsonb_build_object(
    'sub', (select id::text from auth.users where email = 'Fraanblasco2307@gmail.com'),
    'email', 'Fraanblasco2307@gmail.com'
  ),
  provider = 'email',
  updated_at = now()
where user_id = (select id from auth.users where email = 'Fraanblasco2307@gmail.com');

-- Función corregida para futuros usuarios: setea las columnas de token vacías
-- desde el inicio para evitar el mismo error.
create or replace function public.create_coach_user(
  p_email text,
  p_password text,
  p_name text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_exists boolean;
begin
  select exists(select 1 from auth.users where email = p_email) into v_exists;

  if v_exists then
    select id into v_user_id from auth.users where email = p_email;
  else
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
      role,
      confirmation_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      recovery_token,
      phone_change,
      phone_change_token,
      reauthentication_token
    )
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_name),
      now(),
      now(),
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    )
    returning id into v_user_id;

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at
    )
    values (
      p_email,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      'email',
      now(),
      now()
    );
  end if;

  insert into public.profiles (id, role, athlete_id)
  values (v_user_id, 'entrenador', null)
  on conflict (id) do update set
    role = excluded.role,
    athlete_id = excluded.athlete_id;

  return v_user_id;
end;
$$;
