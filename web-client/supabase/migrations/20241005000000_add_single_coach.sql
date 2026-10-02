-- Crea la cuenta de entrenador para Cristian Teves si no existe.
-- La contraseña temporal es: TempPass123!
--
-- Ejecutar con el rol postgres/service_role en el SQL Editor de Supabase.
-- Si el insert directo en auth.identities falla por permisos, la función de abajo
-- usa SECURITY DEFINER para ejecutarse con los privilegios del creador.

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
      role
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
      'authenticated'
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

-- Llamada para crear al entrenador Cristian Teves.
select public.create_coach_user(
  'cristianteves1@gmail.com',
  'TempPass123!',
  'Cristian Teves'
);
