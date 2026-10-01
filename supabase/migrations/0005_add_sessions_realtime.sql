-- SportLink: publicar cambios en sesiones y asistencias para sincronización en tiempo real.
-- Permite que el calendario del entrenador se actualice automáticamente cuando un jugador
-- reserva o cancela un cupo, sin necesidad de refrescar la pantalla.

alter publication supabase_realtime add table public.session_attendances;
alter publication supabase_realtime add table public.training_sessions;
