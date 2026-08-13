import { Injectable, signal } from '@angular/core';
import { CalendarEvent, EventStatus, EventType, MOCK_PLAYERS, PlayerOption, UserRole } from './calendar.model';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function todayAt(hours: number, minutes: number): Date {
  return setTime(new Date(), hours, minutes);
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

const now = new Date();

const initialEvents: CalendarEvent[] = [
  {
    id: generateId(),
    title: 'Entrenamiento técnico',
    type: 'TRAINING',
    start: todayAt(17, 0),
    end: todayAt(18, 30),
    description: 'Trabajo de saque y recepción.',
    participants: ['Carlos'],
    objective: 'Mejorar consistencia en el saque',
    status: 'SCHEDULED',
    createdBy: 'coach',
    playerId: '1',
  },
  {
    id: generateId(),
    title: 'Torneo regional',
    type: 'TOURNAMENT',
    start: setTime(addDays(now, 5), 9, 0),
    end: setTime(addDays(now, 5), 14, 0),
    description: 'Participación en torneo municipal.',
    participants: ['Carlos', 'Ana'],
    status: 'SCHEDULED',
    createdBy: 'coach',
    playerId: '1',
  },
  {
    id: generateId(),
    title: 'Evaluación física',
    type: 'EVALUATION',
    start: setTime(addDays(now, 2), 18, 0),
    end: setTime(addDays(now, 2), 19, 0),
    description: 'Test de resistencia y agilidad.',
    participants: ['Ana'],
    objective: 'Medir condición actual',
    status: 'SCHEDULED',
    createdBy: 'coach',
    playerId: '2',
  },
  {
    id: generateId(),
    title: 'Partido amistoso',
    type: 'MATCH',
    start: setTime(addDays(now, -2), 17, 30),
    end: setTime(addDays(now, -2), 19, 0),
    description: 'Partido contra el club vecino.',
    participants: ['Luis', 'María'],
    status: 'COMPLETED',
    createdBy: 'coach',
    playerId: '3',
  },
];

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly eventsSignal = signal<CalendarEvent[]>(initialEvents);

  readonly events = this.eventsSignal.asReadonly();

  getPlayers(): PlayerOption[] {
    return MOCK_PLAYERS;
  }

  addEvent(event: Omit<CalendarEvent, 'id'>): void {
    const newEvent: CalendarEvent = { ...event, id: generateId() };
    this.eventsSignal.update((current) => [...current, newEvent]);
  }

  updateEvent(updated: CalendarEvent): void {
    this.eventsSignal.update((current) =>
      current.map((event) => (event.id === updated.id ? updated : event)),
    );
  }

  deleteEvent(id: string): void {
    this.eventsSignal.update((current) => current.filter((event) => event.id !== id));
  }

  canEdit(event: CalendarEvent, role: UserRole, userName: string): boolean {
    if (role === 'coach') return true;
    if (event.createdBy === 'player' && event.participants.includes(userName)) return true;
    return false;
  }

  canDelete(event: CalendarEvent, role: UserRole): boolean {
    return role === 'coach';
  }
}
