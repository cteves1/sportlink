/** Rol simulado para probar ambos flujos (mock de autenticación, sin backend real). */
export type UserRole = 'entrenador' | 'jugador';

/** Estado de una asistencia dentro de una sesión de entrenamiento. */
export type AttendanceStatus = 'confirmado' | 'ausente';

/** Jugador simulado disponible en el selector "Iniciar sesión como". */
export interface MockPlayer {
  id: number;
  name: string;
  /** Nivel de juego: 8 = novato/principiante, 1 = élite/avanzado. */
  category: number;
}

/** Cupo de un jugador dentro de una sesión: puede cancelarse liberando el lugar. */
export interface Attendance {
  id: number;
  playerId: number;
  playerName: string;
  category: number;
  status: AttendanceStatus;
}

/** Turno de entrenamiento en una fecha concreta. */
export interface TrainingSession {
  id: number;
  date: Date;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  capacity: number;
  attendances: Attendance[];
}
