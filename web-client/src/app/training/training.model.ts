export interface Player {
  id: string;
  name: string;
  email: string;
}

export type TrainingStatus = 'Planificado' | 'En progreso' | 'Completado' | 'Cancelado';

export interface TrainingBlock {
  id: string;
  name: string;
  description: string;
  duration: number; // minutos
  type: string;
  order: number;
}

export interface CoachEvaluation {
  intensity: number; // 1-10
  performance: number; // 1-10
  observations: string;
}

export interface PlayerFeedback {
  feelings: string;
  difficulty: number; // 1-10
  comments: string;
}

export interface TrainingSession {
  id: string;
  playerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutos totales
  title: string;
  objective: string;
  description: string;
  status: TrainingStatus;
  blocks: TrainingBlock[];
  coachNotes: string;
  coachEvaluation: CoachEvaluation | null;
  playerFeedback: PlayerFeedback | null;
  createdAt: string;
  updatedAt: string;
}

export const TRAINING_BLOCK_TYPES = [
  'Calentamiento',
  'Saque',
  'Recepción',
  'Multibola',
  'Técnica',
  'Táctica',
  'Juego condicionado',
  'Partido',
  'Otros',
];

export const STATUS_OPTIONS: { label: string; value: TrainingStatus; severity: 'info' | 'warn' | 'success' | 'danger' }[] = [
  { label: 'Planificado', value: 'Planificado', severity: 'info' },
  { label: 'En progreso', value: 'En progreso', severity: 'warn' },
  { label: 'Completado', value: 'Completado', severity: 'success' },
  { label: 'Cancelado', value: 'Cancelado', severity: 'danger' },
];

export const MOCK_PLAYERS: Player[] = [
  { id: 'p-001', name: 'Laura Martínez', email: 'laura.martinez@club.com' },
  { id: 'p-002', name: 'Carlos Pérez', email: 'carlos.perez@club.com' },
  { id: 'p-003', name: 'Ana Ruiz', email: 'ana.ruiz@club.com' },
];

export const MOCK_SESSIONS: TrainingSession[] = [
  {
    id: 's-001',
    playerId: 'p-001',
    date: '2026-08-10',
    time: '17:00',
    duration: 90,
    title: 'Sesión técnica: saque y recepción',
    objective: 'Mejorar la consistencia del saque corto y la recepción ofensiva.',
    description: 'Trabajo específico de saque con variaciones de efecto y recepción multibola.',
    status: 'Planificado',
    blocks: [
      { id: 'b-1', name: 'Calentamiento', description: 'Movilidad y golpes básicos.', duration: 15, type: 'Calentamiento', order: 1 },
      { id: 'b-2', name: 'Saque', description: 'Saque corto con variación de efecto.', duration: 25, type: 'Saque', order: 2 },
      { id: 'b-3', name: 'Recepción', description: 'Recepción de saque corto y ataque.', duration: 30, type: 'Recepción', order: 3 },
      { id: 'b-4', name: 'Partido', description: 'Partidos con condicionantes.', duration: 20, type: 'Partido', order: 4 },
    ],
    coachNotes: '',
    coachEvaluation: null,
    playerFeedback: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
