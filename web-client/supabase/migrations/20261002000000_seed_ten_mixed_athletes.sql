-- Seed de desarrollo: inserta 10 atletas ficticios.
-- 3 son Atleta Elite (categoría 0) y los 7 restantes se distribuyen en
-- categorías mixtas (1, 2, 3, 4, 5, 6, 9) con distintos estados y tipos.
--
-- No trunca tablas. Si ya existen usernames/telefonos duplicados, fallará
-- a menos que haya restricciones UNIQUE en esas columnas.

insert into public.athletes (
  first_name, last_name, category, status, player_type, phone,
  username, temp_password, attendance_rate, birth_date, dominant_hand,
  level, paddle_grip, rubber_forehand, rubber_backhand, playing_style,
  club, specific_goal, training_days, setup_completed, welcome_form_completed
)
values
  -- 3 atletas de élite (categoría 0)
  ('Santiago', 'Acosta', 0, 'activo', 'regular', '1150101010', 'sacosta', 'temp101', 96, '1996-04-12', 'derecha', 'avanzado', 'clasica', 'liso', 'liso', 'ofensivo', 'Club Central', 'Clasificar al Nacional', array[1,2,4,5], true, true),
  ('Martina', 'Benítez', 0, 'activo', 'regular', '1150202020', 'mbenitez', 'temp102', 94, '1998-09-25', 'izquierda', 'avanzado', 'lapicero', 'pupo-corto', 'liso', 'all-round', 'Club Central', 'Subir al ranking internacional', array[1,3,5,6], true, true),
  ('Bruno', 'Castillo', 0, 'activo', 'invitado', '1150303030', 'bcastillo', 'temp103', 91, '1997-12-08', 'derecha', 'avanzado', 'clasica', 'liso', 'pupo-largo', 'ofensivo', 'Club Central', 'Ganar medalla provincial', array[2,4,6], true, true),

  -- 7 atletas en categorías variadas
  ('Julieta', 'Domínguez', 1, 'activo', 'regular', '1150404040', 'jdominguez', 'temp104', 88, '1999-02-14', 'derecha', 'avanzado', 'clasica', 'liso', 'liso', 'ofensivo', 'Club Central', 'Ascender a élite', array[1,2,4,5], true, true),
  ('Maximiliano', 'Etcheverry', 2, 'activo', 'regular', '1150505050', 'metcheverry', 'temp105', 82, '2000-06-30', 'derecha', 'intermedio', 'lapicero', 'liso', 'pupo-corto', 'all-round', null, null, array[1,3,5], true, true),
  ('Candelaria', 'Fernández', 3, 'activo', 'regular', '1150606060', 'cfernandez', 'temp106', 79, '2001-11-18', 'izquierda', 'intermedio', 'clasica', 'liso', 'liso', 'defensivo', null, null, array[2,4,6], true, true),
  ('Tomás', 'García', 5, 'activo', 'regular', '1150707070', 'tgarcia', 'temp107', 71, '2003-03-22', 'derecha', 'principiante', 'clasica', null, null, null, null, null, array[3,5], true, false),
  ('Valentina', 'Herrera', 6, 'inactivo', 'regular', '1150808080', 'vherrera', 'temp108', 58, '2004-07-09', 'izquierda', 'principiante', 'clasica', null, null, null, null, null, array[6], true, false),
  ('Diego', 'Ibarra', 4, 'activo', 'invitado', '1150909090', 'dibarra', 'temp109', 85, '2002-10-05', 'derecha', 'intermedio', 'clasica', 'liso', 'liso', 'bloqueador', null, null, array[2,5], true, true),
  ('Morena', 'Juárez', 9, 'activo', 'regular', '1151010101', 'mjuarez', 'temp110', 75, '2010-01-17', 'derecha', 'principiante', 'clasica', null, null, null, 'Club Central', 'Aprender las bases', array[1,3], true, false);
