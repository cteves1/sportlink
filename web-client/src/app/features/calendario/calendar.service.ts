import { Injectable, computed, inject, signal } from '@angular/core';
import { addDays, atMidnight, dateKey, weekdayOf } from '../../core/date/calendar-dates';
import { Athlete, PlayersService } from '../../core/players/players.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
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

interface DbSessionAttendance {
  id: number;
  athlete_id: number;
  status: Attendance['status'];
  presence: Presence;
  athlete: {
    first_name: string;
    last_name: string;
    category: number;
  } | null;
}

interface DbTrainingSession {
  id: number;
  session_date: string;
  shift_label: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  template_id: number | null;
  session_attendances: DbSessionAttendance[] | null;
}

interface DbShiftTemplate {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  weekdays: number[];
  player_ids: number[];
}

/** Datos que el entrenador define de un turno; el id lo asigna el servicio. */
export type ShiftTemplateInput = Omit<ShiftTemplate, 'id'>;

/** Turno suelto que no se repite: se crea directo sobre un día del calendario. */
export interface OneOffSessionInput {
  label: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  playerIds: number[];
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;
  private readonly playersService = inject(PlayersService);
  private readonly freedSlots = inject(FreedSlotsService);

  /** Jugadores mock disponibles para "iniciar sesión como" en la Vista Jugador. */
  readonly players: readonly MockPlayer[] = MOCK_PLAYERS;

  /** Fuente única de verdad: al mutarse, tanto la Vista Entrenador como la Vista
   *  Jugador (que leen este mismo signal) se recalculan y repintan automáticamente. */
  readonly sessions = signal<TrainingSession[]>([]);

  readonly role = signal<UserRole>('entrenador');
  readonly currentPlayerId = signal<number>(MOCK_PLAYERS[0].id);

  readonly templates = signal<ShiftTemplate[]>([]);

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
  // Carga inicial
  // ------------------------------------------------------------------

  async loadTemplates(): Promise<void> {
    const { data, error } = await this.supabase
      .from('shift_templates')
      .select('*')
      .order('start_time')
      .returns<DbShiftTemplate[]>();

    if (error) {
      console.error('Error cargando plantillas:', error);
      return;
    }

    this.templates.set((data ?? []).map((row) => this.mapTemplateFromDb(row)));
  }

  async loadSessionsForRange(from: Date, to: Date): Promise<void> {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('training_sessions')
      .select(
        `
        *,
        session_attendances (
          id,
          athlete_id,
          status,
          presence,
          athlete:athletes (first_name, last_name, category)
        )
      `,
      )
      .gte('session_date', fromStr)
      .lte('session_date', toStr)
      .order('session_date', { ascending: true })
      .returns<DbTrainingSession[]>();

    if (error) {
      console.error('Error cargando sesiones:', error);
      return;
    }

    this.sessions.set((data ?? []).map((row) => this.mapSessionFromDb(row)));
  }

  // ------------------------------------------------------------------
  // Configuración del calendario: jornada, turnos y jugadores fijos
  // ------------------------------------------------------------------

  async addTemplate(input: ShiftTemplateInput): Promise<ShiftTemplate | null> {
    const userId = this.supabaseService.user()?.id;
    const { data, error } = await this.supabase
      .from('shift_templates')
      .insert({
        label: input.label,
        start_time: input.startTime,
        end_time: input.endTime,
        capacity: input.capacity,
        weekdays: [...input.weekdays].sort((a, b) => a - b),
        player_ids: input.playerIds,
        created_by: userId,
      })
      .select('*')
      .single<DbShiftTemplate>();

    if (error || !data) {
      console.error('Error creando plantilla:', error);
      return null;
    }

    const template = this.mapTemplateFromDb(data);
    this.templates.update((list) => [...list, template].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return template;
  }

  async updateTemplate(templateId: number, input: ShiftTemplateInput): Promise<void> {
    const { error } = await this.supabase
      .from('shift_templates')
      .update({
        label: input.label,
        start_time: input.startTime,
        end_time: input.endTime,
        capacity: input.capacity,
        weekdays: [...input.weekdays].sort((a, b) => a - b),
        player_ids: input.playerIds,
      })
      .eq('id', templateId);

    if (error) {
      console.error('Error actualizando plantilla:', error);
      return;
    }

    await this.loadTemplates();
    await this.dropUpcomingSessionsOf(templateId);
  }

  async deleteTemplate(templateId: number): Promise<void> {
    const { error } = await this.supabase.from('shift_templates').delete().eq('id', templateId);

    if (error) {
      console.error('Error eliminando plantilla:', error);
      return;
    }

    this.templates.update((list) => list.filter((t) => t.id !== templateId));
    await this.dropUpcomingSessionsOf(templateId);
  }

  /**
   * Materializa las sesiones de los turnos configurados para el rango visible del calendario.
   * Es idempotente: no duplica una sesión ya creada por la misma plantilla ni pisa una sesión
   * existente en el mismo horario, y nunca inventa turnos en el pasado.
   */
  async ensureSessionsForRange(from: Date, to: Date): Promise<void> {
    const templates = this.templates();
    if (templates.length === 0) {
      await this.loadSessionsForRange(from, to);
      return;
    }

    await this.loadSessionsForRange(from, to);
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
    const created: Omit<DbTrainingSession, 'id' | 'session_attendances'>[] = [];

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
        created.push(this.sessionInsertFromTemplate(template, date));
      }
    }

    if (created.length === 0) return;

    const { error } = await this.supabase.from('training_sessions').insert(created);

    if (error) {
      console.error('Error generando sesiones:', error);
      return;
    }

    await this.loadSessionsForRange(from, to);
  }

  /** Agrega un jugador de la base real a un turno concreto (alta puntual del entrenador). */
  async addAthleteToSession(sessionId: number, athlete: Athlete): Promise<void> {
    await this.bookAttendance(sessionId, {
      id: athlete.id,
      name: `${athlete.firstName} ${athlete.lastName}`,
      category: athlete.category,
    });
  }

  /**
   * Crea un turno puntual en una fecha concreta (por ejemplo, una particular acordada con un
   * jugador), sin plantilla detrás. Devuelve `null` si ya hay un turno a esa misma hora ese
   * día, para no pisar el turno existente ni bloquear la generación de la jornada.
   */
  async addSessionOn(date: Date, input: OneOffSessionInput): Promise<TrainingSession | null> {
    const day = atMidnight(date);
    const key = dateKey(day);
    const clash = this.sessions().some(
      (session) => dateKey(session.date) === key && session.startTime === input.startTime,
    );
    if (clash) return null;

    const { data, error } = await this.supabase
      .from('training_sessions')
      .insert({
        session_date: day.toISOString().split('T')[0],
        shift_label: input.label,
        start_time: input.startTime,
        end_time: input.endTime,
        capacity: input.capacity,
        template_id: null,
      })
      .select('*')
      .single<DbTrainingSession>();

    if (error || !data) {
      console.error('Error creando sesión puntual:', error);
      return null;
    }

    const session = this.mapSessionFromDb(data);
    this.sessions.update((sessions) => [...sessions, session]);
    return session;
  }

  /** Elimina un turno puntual (los generados por una plantilla se quitan desde la configuración). */
  async removeSession(sessionId: number): Promise<void> {
    const { error } = await this.supabase
      .from('training_sessions')
      .delete()
      .eq('id', sessionId)
      .is('template_id', null);

    if (error) {
      console.error('Error eliminando sesión puntual:', error);
      return;
    }

    this.sessions.update((sessions) => sessions.filter((session) => session.id !== sessionId));
  }

  /** Descarta las sesiones de hoy en adelante generadas por una plantilla que cambió o se borró. */
  private async dropUpcomingSessionsOf(templateId: number): Promise<void> {
    const today = atMidnight(new Date());
    const todayStr = today.toISOString().split('T')[0];

    const { error } = await this.supabase
      .from('training_sessions')
      .delete()
      .eq('template_id', templateId)
      .gte('session_date', todayStr);

    if (error) {
      console.error('Error descartando sesiones futuras:', error);
      return;
    }

    this.sessions.update((sessions) =>
      sessions.filter(
        (session) =>
          session.templateId !== templateId || atMidnight(session.date).getTime() < today.getTime(),
      ),
    );
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
   */
  async bookAttendance(
    sessionId: number,
    player: { id: number; name: string; category: number },
  ): Promise<void> {
    const session = this.sessions().find((s) => s.id === sessionId);
    if (!session || !this.hasFreeSlot(session)) return;

    const existing = this.attendanceFor(session, player.id);
    if (existing) {
      if (existing.status === 'ausente') {
        await this.restoreAttendance(sessionId, existing.id);
      }
      return;
    }

    const { error } = await this.supabase.from('session_attendances').insert({
      session_id: sessionId,
      athlete_id: player.id,
      status: 'confirmado',
    });

    if (error) {
      console.error('Error reservando asistencia:', error);
      return;
    }

    // Refresca la sesión para reflejar la nueva asistencia (incluyendo nombre y categoría).
    await this.refreshSession(sessionId);
  }

  /** Turnos programados para una fecha concreta. */
  sessionsForDate(date: Date): TrainingSession[] {
    return this.sessionsByDateKey().get(dateKey(date)) ?? [];
  }

  presentCount(session: TrainingSession): number {
    return session.attendances.filter((a) => a.presence === 'presente').length;
  }

  /** Registra (o limpia, con `null`) la presencia real de un jugador en un turno. */
  async setPresence(sessionId: number, attendanceId: number, presence: Presence): Promise<void> {
    const { error } = await this.supabase
      .from('session_attendances')
      .update({ presence })
      .eq('id', attendanceId);

    if (error) {
      console.error('Error registrando presencia:', error);
      return;
    }

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
  }

  attendanceFor(session: TrainingSession, playerId: number): Attendance | undefined {
    return session.attendances.find((a) => a.playerId === playerId);
  }

  /**
   * Cancela la asistencia de un jugador: libera el cupo de inmediato para quien mire la Vista
   * Entrenador y registra el cupo liberado para poder avisar a los demás jugadores.
   * Devuelve el evento creado (o `null` si la asistencia ya no existe).
   */
  async cancelAttendance(sessionId: number, attendanceId: number): Promise<FreedSlotEvent | null> {
    const { error } = await this.supabase
      .from('session_attendances')
      .update({ status: 'ausente' })
      .eq('id', attendanceId);

    if (error) {
      console.error('Error cancelando asistencia:', error);
      return null;
    }

    await this.refreshSession(sessionId);
    await this.freedSlots.loadEvents();

    const event = this.freedSlots
      .events()
      .find((e) => e.sessionId === sessionId && e.attendanceId === attendanceId);
    return event ?? null;
  }

  /** Revierte una cancelación (útil para probar el flujo repetidamente en la demo). */
  async restoreAttendance(sessionId: number, attendanceId: number): Promise<void> {
    const { error } = await this.supabase
      .from('session_attendances')
      .update({ status: 'confirmado' })
      .eq('id', attendanceId);

    if (error) {
      console.error('Error restaurando asistencia:', error);
      return;
    }

    await this.refreshSession(sessionId);
    await this.freedSlots.loadEvents();
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private async refreshSession(sessionId: number): Promise<void> {
    const { data, error } = await this.supabase
      .from('training_sessions')
      .select(
        `
        *,
        session_attendances (
          id,
          athlete_id,
          status,
          presence,
          athlete:athletes (first_name, last_name, category)
        )
      `,
      )
      .eq('id', sessionId)
      .single<DbTrainingSession>();

    if (error || !data) {
      console.error('Error refrescando sesión:', error);
      return;
    }

    const session = this.mapSessionFromDb(data);
    this.sessions.update((sessions) => sessions.map((s) => (s.id === sessionId ? session : s)));
  }

  private mapTemplateFromDb(row: DbShiftTemplate): ShiftTemplate {
    return {
      id: row.id,
      label: row.label,
      startTime: row.start_time,
      endTime: row.end_time,
      capacity: row.capacity,
      weekdays: (row.weekdays ?? []) as ShiftTemplate['weekdays'],
      playerIds: row.player_ids ?? [],
    };
  }

  private mapSessionFromDb(row: DbTrainingSession): TrainingSession {
    const attendances = (row.session_attendances ?? [])
      .filter((a): a is DbSessionAttendance & { athlete: NonNullable<DbSessionAttendance['athlete']> } => a.athlete !== null)
      .map(
        (a): Attendance => ({
          id: a.id,
          playerId: a.athlete_id,
          playerName: `${a.athlete.first_name} ${a.athlete.last_name}`,
          category: a.athlete.category,
          status: a.status,
          presence: a.presence,
        }),
      );

    return {
      id: row.id,
      date: new Date(`${row.session_date}T00:00:00`),
      shiftLabel: row.shift_label,
      startTime: row.start_time,
      endTime: row.end_time,
      capacity: row.capacity,
      templateId: row.template_id,
      attendances,
    };
  }

  private sessionInsertFromTemplate(
    template: ShiftTemplate,
    date: Date,
  ): Omit<DbTrainingSession, 'id' | 'session_attendances'> {
    return {
      session_date: date.toISOString().split('T')[0],
      shift_label: template.label,
      start_time: template.startTime,
      end_time: template.endTime,
      capacity: template.capacity,
      template_id: template.id,
    };
  }
}
