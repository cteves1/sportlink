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

/** Presencia real registrada por el entrenador el día del turno (`null` = sin registrar). */
export type Presence = 'presente' | 'ausente' | null;

/** Cupo de un jugador dentro de una sesión: puede cancelarse liberando el lugar. */
export interface Attendance {
  id: number;
  playerId: number;
  playerName: string;
  category: number;
  /** Estado de la reserva del cupo (lo gestiona el jugador). */
  status: AttendanceStatus;
  /** Presencia registrada por el entrenador; opcional para tolerar datos ya persistidos. */
  presence?: Presence;
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
