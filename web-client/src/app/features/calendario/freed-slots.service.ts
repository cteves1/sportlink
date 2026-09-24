import { Injectable, computed, signal } from '@angular/core';
import { Attendance, FreedSlotEvent, TrainingSession } from './calendar.models';

const STORAGE_KEY = 'tt-trainer-freed-slots';

@Injectable({ providedIn: 'root' })
export class FreedSlotsService {
  private readonly _events = signal<FreedSlotEvent[]>(this.readStored());
  readonly events = this._events.asReadonly();

  /** Cupos liberados de los que el entrenador todavía no decidió si avisar, del más reciente al más antiguo. */
  readonly pending = computed<FreedSlotEvent[]>(() =>
    this._events()
      .filter((event) => event.status === 'pendiente')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  );

  /** Registra el cupo que dejó libre una cancelación y devuelve el evento creado. */
  register(session: TrainingSession, attendance: Attendance): FreedSlotEvent {
    const event: FreedSlotEvent = {
      id: Math.max(0, ...this._events().map((e) => e.id)) + 1,
      sessionId: session.id,
      attendanceId: attendance.id,
      playerId: attendance.playerId,
      playerName: attendance.playerName,
      sessionDate: session.date,
      shiftLabel: session.shiftLabel,
      startTime: session.startTime,
      endTime: session.endTime,
      createdAt: new Date(),
      status: 'pendiente',
      notifiedPlayerIds: [],
      notifiedAt: null,
    };

    this.update([...this._events(), event]);
    return event;
  }

  find(eventId: number): FreedSlotEvent | undefined {
    return this._events().find((event) => event.id === eventId);
  }

  /** Deja constancia de a quiénes se avisó del cupo liberado. */
  markNotified(eventId: number, playerIds: readonly number[]): void {
    this.patch(eventId, {
      status: 'avisado',
      notifiedPlayerIds: [...playerIds],
      notifiedAt: new Date(),
    });
  }

  /** El entrenador decide no avisar: el cupo sale de la bandeja de pendientes. */
  dismiss(eventId: number): void {
    this.patch(eventId, { status: 'descartado' });
  }

  /** Quita el evento cuando se deshace la cancelación y el cupo vuelve a estar ocupado. */
  removeFor(sessionId: number, attendanceId: number): void {
    this.update(
      this._events().filter(
        (event) => event.sessionId !== sessionId || event.attendanceId !== attendanceId,
      ),
    );
  }

  private patch(eventId: number, changes: Partial<FreedSlotEvent>): void {
    this.update(
      this._events().map((event) => (event.id === eventId ? { ...event, ...changes } : event)),
    );
  }

  private update(events: FreedSlotEvent[]): void {
    this._events.set(events);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.): se ignora silenciosamente.
    }
  }

  /** Lee los eventos guardados rehidratando las fechas; si está corrupto, arranca vacío. */
  private readStored(): FreedSlotEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as FreedSlotEvent[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((event) => ({
        ...event,
        sessionDate: new Date(event.sessionDate),
        createdAt: new Date(event.createdAt),
        notifiedAt: event.notifiedAt ? new Date(event.notifiedAt) : null,
      }));
    } catch {
      return [];
    }
  }
}
