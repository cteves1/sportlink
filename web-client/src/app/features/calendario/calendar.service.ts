import { Injectable, computed, signal } from '@angular/core';
import { addDays, atMidnight, dateKey } from '../../core/date/calendar-dates';
import { Attendance, MockPlayer, Presence, TrainingSession, UserRole } from './calendar.models';

export { dateKey };

const MOCK_PLAYERS: MockPlayer[] = [
  { id: 1, name: 'Matías Fernández', category: 1 },
  { id: 2, name: 'Sofía Rojas', category: 2 },
  { id: 3, name: 'Diego Vargas', category: 3 },
  { id: 4, name: 'Camila Torres', category: 3 },
  { id: 5, name: 'Ignacio Soto', category: 4 },
  { id: 6, name: 'Valentina Muñoz', category: 4 },
  { id: 7, name: 'Benjamín Castro', category: 5 },
  { id: 8, name: 'Antonia Reyes', category: 6 },
];

function attendanceOf(playerId: number, status: Attendance['status'] = 'confirmado'): Attendance {
  const player = MOCK_PLAYERS.find((p) => p.id === playerId)!;
  return { id: playerId, playerId, playerName: player.name, category: player.category, status };
}

const today = atMidnight(new Date());

function buildMockSessions(): TrainingSession[] {
  let nextId = 1;
  const session = (
    dayOffset: number,
    shiftLabel: string,
    startTime: string,
    endTime: string,
    attendances: Attendance[],
  ): TrainingSession => ({
    id: nextId++,
    date: addDays(today, dayOffset),
    shiftLabel,
    startTime,
    endTime,
    capacity: 6,
    attendances,
  });

  return [
    session(-3, 'Turno Tarde', '16:00', '18:00', [
      attendanceOf(1),
      attendanceOf(2),
      attendanceOf(3, 'ausente'),
      attendanceOf(4),
    ]),
    session(-1, 'Turno Mañana', '09:00', '11:00', [attendanceOf(5), attendanceOf(6)]),
    session(0, 'Turno Mañana', '09:00', '11:00', [
      attendanceOf(1),
      attendanceOf(4),
      attendanceOf(7),
    ]),
    session(0, 'Turno Tarde', '16:00', '18:00', [
      attendanceOf(2),
      attendanceOf(3),
      attendanceOf(5),
      attendanceOf(6),
      attendanceOf(8, 'ausente'),
    ]),
    session(2, 'Turno Noche', '19:00', '21:00', [
      attendanceOf(1),
      attendanceOf(6),
      attendanceOf(7),
    ]),
    session(4, 'Turno Tarde', '16:00', '18:00', [
      attendanceOf(2),
      attendanceOf(4),
      attendanceOf(5),
      attendanceOf(6),
      attendanceOf(7),
      attendanceOf(8),
    ]),
    session(6, 'Turno Mañana', '09:00', '11:00', [attendanceOf(3), attendanceOf(8)]),
    session(6, 'Turno Noche', '19:00', '21:00', [
      attendanceOf(1),
      attendanceOf(2),
      attendanceOf(3),
    ]),
    session(9, 'Turno Tarde', '16:00', '18:00', [
      attendanceOf(4),
      attendanceOf(5),
      attendanceOf(1),
    ]),
    session(11, 'Turno Mañana', '09:00', '11:00', [
      attendanceOf(6),
      attendanceOf(7),
      attendanceOf(2, 'ausente'),
    ]),
    session(13, 'Turno Noche', '19:00', '21:00', [
      attendanceOf(8),
      attendanceOf(3),
      attendanceOf(4),
    ]),
    session(16, 'Turno Tarde', '16:00', '18:00', [
      attendanceOf(1),
      attendanceOf(5),
      attendanceOf(6),
      attendanceOf(7),
    ]),
  ];
}

const STORAGE_KEY = 'tt-trainer-calendar-sessions';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  /** Jugadores mock disponibles para "iniciar sesión como" en la Vista Jugador. */
  readonly players: readonly MockPlayer[] = MOCK_PLAYERS;

  /** Fuente única de verdad: al mutarse, tanto la Vista Entrenador como la Vista
   *  Jugador (que leen este mismo signal) se recalculan y repintan automáticamente. */
  readonly sessions = signal<TrainingSession[]>(this.readStored());

  readonly role = signal<UserRole>('entrenador');
  readonly currentPlayerId = signal<number>(MOCK_PLAYERS[0].id);

  /** Sesiones agrupadas por día (clave 'yyyy-mm-dd') para pintar la grilla sin recorrer todo el arreglo por celda. */
  readonly sessionsByDateKey = computed<Map<string, TrainingSession[]>>(() => {
    const map = new Map<string, TrainingSession[]>();
    for (const s of this.sessions()) {
      const key = dateKey(s.date);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  });

  setRole(role: UserRole): void {
    this.role.set(role);
  }

  setCurrentPlayer(playerId: number): void {
    this.currentPlayerId.set(playerId);
  }

  confirmedCount(session: TrainingSession): number {
    return session.attendances.filter((a) => a.status === 'confirmado').length;
  }

  /** Turnos programados para una fecha concreta. */
  sessionsForDate(date: Date): TrainingSession[] {
    return this.sessionsByDateKey().get(dateKey(date)) ?? [];
  }

  presentCount(session: TrainingSession): number {
    return session.attendances.filter((a) => a.presence === 'presente').length;
  }

  /** Registra (o limpia, con `null`) la presencia real de un jugador en un turno. */
  setPresence(sessionId: number, attendanceId: number, presence: Presence): void {
    this.sessions.update((sessions) =>
      sessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              attendances: session.attendances.map((attendance) =>
                attendance.id === attendanceId ? { ...attendance, presence } : attendance,
              ),
            },
      ),
    );
    this.persist();
  }

  attendanceFor(session: TrainingSession, playerId: number): Attendance | undefined {
    return session.attendances.find((a) => a.playerId === playerId);
  }

  /** Cancela la asistencia de un jugador: libera el cupo de inmediato para quien mire la Vista Entrenador. */
  cancelAttendance(sessionId: number, attendanceId: number): void {
    this.updateAttendanceStatus(sessionId, attendanceId, 'ausente');
  }

  /** Revierte una cancelación (útil para probar el flujo repetidamente en la demo). */
  restoreAttendance(sessionId: number, attendanceId: number): void {
    this.updateAttendanceStatus(sessionId, attendanceId, 'confirmado');
  }

  private updateAttendanceStatus(
    sessionId: number,
    attendanceId: number,
    status: Attendance['status'],
  ): void {
    this.sessions.update((sessions) =>
      sessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              attendances: session.attendances.map((attendance) =>
                attendance.id === attendanceId ? { ...attendance, status } : attendance,
              ),
            },
      ),
    );
    this.persist();
  }

  /** Persiste las sesiones (con sus asistencias) en localStorage para que sobrevivan a recargas. */
  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions()));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.): se ignora silenciosamente.
    }
  }

  /** Lee las sesiones guardadas; si no hay nada o está corrupto, usa la semilla mock determinística. */
  private readStored(): TrainingSession[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildMockSessions();
    try {
      const parsed = JSON.parse(raw) as TrainingSession[];
      if (!Array.isArray(parsed)) return buildMockSessions();
      return parsed.map((session) => ({ ...session, date: new Date(session.date) }));
    } catch {
      return buildMockSessions();
    }
  }
}
