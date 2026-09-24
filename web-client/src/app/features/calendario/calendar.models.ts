import { Weekday } from '../../core/players/players.service';

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
  /** Tope de jugadores del turno; `null` = sin límite (ni mínimo ni máximo). */
  capacity: number | null;
  attendances: Attendance[];
  /** Plantilla que generó el turno; `null` si se creó a mano o viene de la semilla de demo. */
  templateId: number | null;
}

/**
 * Plantilla de turno configurada por el entrenador: define la jornada (qué días de la
 * semana se repite), el horario y los jugadores fijos. De aquí se materializan los
 * `TrainingSession` de cada fecha concreta al navegar el calendario.
 */
export interface ShiftTemplate {
  id: number;
  label: string;
  startTime: string;
  endTime: string;
  /** Jornada: días de la semana en los que se dicta el turno (1 = lunes … 7 = domingo). */
  weekdays: Weekday[];
  /** Tope opcional de jugadores; `null` = sin límite. */
  capacity: number | null;
  /** Jugadores fijos que quedan anotados en cada sesión generada. */
  playerIds: number[];
}

/** Estado del aviso de un cupo liberado: pendiente de decidir, ya avisado o descartado. */
export type FreedSlotStatus = 'pendiente' | 'avisado' | 'descartado';

/**
 * Cupo que quedó libre porque un jugador canceló su turno. Se le pregunta al entrenador
 * si quiere avisar a los jugadores; mientras no decida, queda `pendiente` en su bandeja.
 */
export interface FreedSlotEvent {
  id: number;
  sessionId: number;
  attendanceId: number;
  /** Jugador que canceló (no se le vuelve a ofrecer el cupo). */
  playerId: number;
  playerName: string;
  sessionDate: Date;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  createdAt: Date;
  status: FreedSlotStatus;
  /** Destinatarios del aviso ya enviado. */
  notifiedPlayerIds: number[];
  notifiedAt: Date | null;
}
