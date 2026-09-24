import { Injectable, computed, inject, signal } from '@angular/core';
import { addDays, atMidnight, dateKey, weekdayOf } from '../../core/date/calendar-dates';
import { Athlete, PlayersService, Weekday } from '../../core/players/players.service';
import {
  Attendance,
  FreedSlotEvent,
  MockPlayer,
  Presence,
  ShiftTemplate,
  TrainingSession,
  UserRole,
} from './calendar.models';
import { FreedSlotsService } from './freed-slots.service';

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
    templateId: null,
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
const TEMPLATES_STORAGE_KEY = 'tt-trainer-shift-templates';

/** Jornada y turno de arranque (lunes a viernes por la mañana), editables desde la configuración. */
const DEFAULT_TEMPLATES: ShiftTemplate[] = [
  {
    id: 1,
    label: 'Turno Mañana',
    startTime: '09:00',
    endTime: '13:00',
    weekdays: [1, 2, 3, 4, 5],
    capacity: null,
    playerIds: [],
  },
];

/** Datos que el entrenador define de un turno; el id lo asigna el servicio. */
export type ShiftTemplateInput = Omit<ShiftTemplate, 'id'>;

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly playersService = inject(PlayersService);
  private readonly freedSlots = inject(FreedSlotsService);

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

  // ------------------------------------------------------------------
  // Configuración del calendario: jornada, turnos y jugadores fijos
  // ------------------------------------------------------------------

  /** Turnos configurados por el entrenador, de los que se derivan las sesiones del calendario. */
  readonly templates = signal<ShiftTemplate[]>(this.readStoredTemplates());

  addTemplate(input: ShiftTemplateInput): ShiftTemplate {
    const template: ShiftTemplate = {
      ...input,
      id: Math.max(0, ...this.templates().map((t) => t.id)) + 1,
      weekdays: [...input.weekdays].sort((a, b) => a - b),
    };
    this.templates.update((list) => [...list, template]);
    this.persistTemplates();
    return template;
  }

  /**
   * Reemplaza la configuración de un turno. Las sesiones futuras ya materializadas se
   * descartan para que se vuelvan a generar con el horario, la jornada y los jugadores
   * nuevos; las pasadas se conservan como historial de asistencia.
   */
  updateTemplate(templateId: number, input: ShiftTemplateInput): void {
    this.templates.update((list) =>
      list.map((template) =>
        template.id === templateId
          ? {
              ...template,
              ...input,
              weekdays: [...input.weekdays].sort((a, b) => a - b),
            }
          : template,
      ),
    );
    this.persistTemplates();
    this.dropUpcomingSessionsOf(templateId);
  }

  /** Elimina un turno de la configuración y sus sesiones futuras (el historial pasado queda intacto). */
  deleteTemplate(templateId: number): void {
    this.templates.update((list) => list.filter((template) => template.id !== templateId));
    this.persistTemplates();
    this.dropUpcomingSessionsOf(templateId);
  }

  /**
   * Materializa las sesiones de los turnos configurados para el rango visible del calendario.
   * Es idempotente: no duplica una sesión ya creada por la misma plantilla ni pisa una sesión
   * existente en el mismo horario, y nunca inventa turnos en el pasado.
   */
  ensureSessionsForRange(from: Date, to: Date): void {
    const templates = this.templates();
    if (templates.length === 0) return;

    const current = this.sessions();
    const taken = new Set<string>();
    for (const session of current) {
      const key = dateKey(session.date);
      if (session.templateId !== null) taken.add(`t${session.templateId}@${key}`);
      taken.add(`h${session.startTime}@${key}`);
    }

    const today = atMidnight(new Date());
    const start = atMidnight(from);
    const end = atMidnight(to);
    const created: TrainingSession[] = [];
    let nextId = Math.max(0, ...current.map((session) => session.id)) + 1;

    for (let date = start; date.getTime() <= end.getTime(); date = addDays(date, 1)) {
      if (date.getTime() < today.getTime()) continue;
      const weekday = weekdayOf(date);
      const key = dateKey(date);

      for (const template of templates) {
        if (!template.weekdays.includes(weekday)) continue;
        if (taken.has(`t${template.id}@${key}`) || taken.has(`h${template.startTime}@${key}`)) {
          continue;
        }
        taken.add(`t${template.id}@${key}`);
        taken.add(`h${template.startTime}@${key}`);
        created.push(this.sessionFromTemplate(nextId++, template, date));
      }
    }

    if (created.length === 0) return;
    this.sessions.update((sessions) => [...sessions, ...created]);
    this.persist();
  }

  /** Agrega un jugador de la base real a un turno concreto (alta puntual del entrenador). */
  addAthleteToSession(sessionId: number, athlete: Athlete): void {
    this.bookAttendance(sessionId, {
      id: athlete.id,
      name: `${athlete.firstName} ${athlete.lastName}`,
      category: athlete.category,
    });
  }

  /** Sesión concreta a partir de una plantilla, con sus jugadores fijos ya confirmados. */
  private sessionFromTemplate(id: number, template: ShiftTemplate, date: Date): TrainingSession {
    const athletes = this.playersService.athletes();
    const attendances: Attendance[] = template.playerIds
      .map((playerId) => athletes.find((athlete) => athlete.id === playerId))
      .filter((athlete): athlete is Athlete => athlete !== undefined)
      .map((athlete, index) => ({
        id: index + 1,
        playerId: athlete.id,
        playerName: `${athlete.firstName} ${athlete.lastName}`,
        category: athlete.category,
        status: 'confirmado' as const,
        presence: null,
      }));

    return {
      id,
      date,
      shiftLabel: template.label,
      startTime: template.startTime,
      endTime: template.endTime,
      capacity: template.capacity,
      attendances,
      templateId: template.id,
    };
  }

  /** Descarta las sesiones de hoy en adelante generadas por una plantilla que cambió o se borró. */
  private dropUpcomingSessionsOf(templateId: number): void {
    const today = atMidnight(new Date());
    this.sessions.update((sessions) =>
      sessions.filter(
        (session) =>
          session.templateId !== templateId || atMidnight(session.date).getTime() < today.getTime(),
      ),
    );
    this.persist();
  }

  setRole(role: UserRole): void {
    this.role.set(role);
  }

  setCurrentPlayer(playerId: number): void {
    this.currentPlayerId.set(playerId);
  }

  confirmedCount(session: TrainingSession): number {
    return session.attendances.filter((a) => a.status === 'confirmado').length;
  }

  /** Cupos todavía libres en un turno; `null` cuando el turno no tiene tope. */
  freeSlots(session: TrainingSession): number | null {
    if (session.capacity === null) return null;
    return Math.max(0, session.capacity - this.confirmedCount(session));
  }

  /** Un turno sin tope siempre acepta un jugador más. */
  hasFreeSlot(session: TrainingSession): boolean {
    const free = this.freeSlots(session);
    return free === null || free > 0;
  }

  /**
   * Reserva un cupo para un jugador. Si ya tenía una asistencia cancelada en el turno la
   * restaura; si no, agrega una nueva. No hace nada si el turno está completo o ya reservó.
   *
   * El jugador llega desde la cuenta autenticada (`PlayersService`) o desde el selector mock
   * de la Vista Jugador; ambas numeraciones de id conviven en la demo sin backend.
   */
  bookAttendance(sessionId: number, player: { id: number; name: string; category: number }): void {
    const session = this.sessions().find((s) => s.id === sessionId);
    if (!session || !this.hasFreeSlot(session)) return;

    const existing = this.attendanceFor(session, player.id);
    if (existing) {
      if (existing.status === 'ausente') {
        this.restoreAttendance(sessionId, existing.id);
      }
      return;
    }

    const newAttendance: Attendance = {
      id: Math.max(0, ...session.attendances.map((a) => a.id)) + 1,
      playerId: player.id,
      playerName: player.name,
      category: player.category,
      status: 'confirmado',
      presence: null,
    };

    this.sessions.update((sessions) =>
      sessions.map((s) =>
        s.id === sessionId ? { ...s, attendances: [...s.attendances, newAttendance] } : s,
      ),
    );
    this.persist();
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

  /**
   * Cancela la asistencia de un jugador: libera el cupo de inmediato para quien mire la Vista
   * Entrenador y registra el cupo liberado para poder avisar a los demás jugadores.
   * Devuelve el evento creado (o `null` si la asistencia ya no existe).
   */
  cancelAttendance(sessionId: number, attendanceId: number): FreedSlotEvent | null {
    const session = this.sessions().find((s) => s.id === sessionId);
    const attendance = session?.attendances.find((a) => a.id === attendanceId);
    if (!session || !attendance) return null;

    this.updateAttendanceStatus(sessionId, attendanceId, 'ausente');
    return this.freedSlots.register(session, attendance);
  }

  /** Revierte una cancelación (útil para probar el flujo repetidamente en la demo). */
  restoreAttendance(sessionId: number, attendanceId: number): void {
    this.updateAttendanceStatus(sessionId, attendanceId, 'confirmado');
    this.freedSlots.removeFor(sessionId, attendanceId);
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
      // Normaliza los registros guardados antes de que existieran los turnos configurables.
      return parsed.map((session) => ({
        ...session,
        date: new Date(session.date),
        capacity: session.capacity ?? null,
        templateId: session.templateId ?? null,
      }));
    } catch {
      return buildMockSessions();
    }
  }

  private persistTemplates(): void {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(this.templates()));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.): se ignora silenciosamente.
    }
  }

  /** Lee los turnos configurados; sin nada guardado arranca con la jornada por defecto. */
  private readStoredTemplates(): ShiftTemplate[] {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATES.map((template) => ({ ...template }));
    try {
      const parsed = JSON.parse(raw) as ShiftTemplate[];
      if (!Array.isArray(parsed)) return DEFAULT_TEMPLATES.map((template) => ({ ...template }));
      return parsed.map((template) => ({
        ...template,
        weekdays: (template.weekdays ?? []) as Weekday[],
        capacity: template.capacity ?? null,
        playerIds: template.playerIds ?? [],
      }));
    } catch {
      return DEFAULT_TEMPLATES.map((template) => ({ ...template }));
    }
  }
}
