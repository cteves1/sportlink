-- Script para limpiar la base de datos de la app y empezar desde cero.
--
-- ATENCIÓN: este script borra TODOS los datos de las tablas públicas de la
-- aplicación. No se puede deshacer.
--
-- Ejecutar solo con el rol postgres/service_role en el SQL Editor de Supabase.
--
-- NOTA: las cuentas de Supabase Auth (auth.users) no se borran con este script
-- porque requieren permisos especiales. Para eliminarlas, usá el panel de
-- Authentication de Supabase o la API de administración.

truncate table
  public.session_attendances,
  public.training_sessions,
  public.shift_templates,
  public.freed_slots,
  public.payments,
  public.welcome_form_answers,
  public.deleted_athletes,
  public.athletes,
  public.profiles
restart identity cascade;

-- Si también querés borrar los usuarios de autenticación, hacelo desde el
-- panel de Supabase: Authentication → Users → seleccioná todos → Delete.
