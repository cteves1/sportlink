-- SportLink: corrige recursión infinita en políticas RLS.
--
-- El helper is_coach_or_admin() consulta public.profiles, pero profiles tenía una
-- política que a su vez llamaba a is_coach_or_admin(), generando recursión infinita
-- (42P17). Lo reemplazamos por una función security definer que lee profiles sin
-- volver a aplicar RLS sobre sí misma.

create or replace function public.is_coach_or_admin()
returns boolean
language plpgsql
security definer
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('entrenador', 'admin')
  );
end;
$$;

-- Las políticas de jugadores sobre athletes se autoreferenciaban (consultaban
-- public.athletes dentro de la política de athletes). Se simplifican para usar
-- únicamente la vinculación profiles.athlete_id.
drop policy if exists "Jugadores ven y actualizan su propia ficha" on public.athletes;
drop policy if exists "Jugadores actualizan su propia ficha (limitado)" on public.athletes;

create policy "Jugadores ven su propia ficha"
  on public.athletes for select
  using (
    id = (select athlete_id from public.profiles where id = auth.uid())
  );

create policy "Jugadores actualizan su propia ficha"
  on public.athletes for update
  using (
    id = (select athlete_id from public.profiles where id = auth.uid())
  );
