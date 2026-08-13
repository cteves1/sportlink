export type EventType = 'TRAINING' | 'TOURNAMENT' | 'EVALUATION' | 'MATCH' | 'OTHER';

export type EventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type UserRole = 'coach' | 'player';

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  start: Date;
  end: Date;
  description: string;
  participants: string[];
  objective?: string;
  status: EventStatus;
  createdBy: UserRole;
  playerId?: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  TRAINING: 'Entrenamiento',
  TOURNAMENT: 'Torneo',
  EVALUATION: 'Evaluación',
  MATCH: 'Partido',
  OTHER: 'Otro',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  TRAINING: '#14824b',
  TOURNAMENT: '#f59e0b',
  EVALUATION: '#3b82f6',
  MATCH: '#f97316',
  OTHER: '#6b7280',
};

export interface PlayerOption {
  id: string;
  name: string;
}

export const MOCK_PLAYERS: PlayerOption[] = [
  { id: '1', name: 'Carlos' },
  { id: '2', name: 'Ana' },
  { id: '3', name: 'Luis' },
  { id: '4', name: 'María' },
];
