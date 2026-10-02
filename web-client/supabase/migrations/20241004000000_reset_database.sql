-- Script para limpiar la base de datos y empezar desde cero.
--
-- ATENCIÓN: este script borra TODOS los datos de la app y las cuentas de
-- usuario de Supabase Auth. No se puede deshacer.
--
-- Ejecutar solo con el rol postgres/service_role en el SQL Editor de Supabase.
--
-- Si querés conservar las cuentas de entrenadores, comentá o eliminá las líneas
-- de auth.identities y auth.users antes de ejecutar.

truncate table
  public.session_attendances,
  public.training_sessions,
  public.shift_templates,
  public.freed_slots,
  public.payments,
  public.welcome_form_answers,
  public.deleted_athletes,
  public.athletes,
  public.profiles,
  auth.identities,
  auth.users
restart identity cascade;
