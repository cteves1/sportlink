import { UserRole } from '../../auth/auth.service';
import {
  Activity,
  DashboardData,
  DashboardEvent,
  Note,
  Objective,
  Player,
  Training,
} from '../models/dashboard.model';

const now = new Date();

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

const sharedTraining: Training = {
  id: 't1',
  title: 'Entrenamiento de recepción de saque',
  date: setTime(addDays(now, 1), 18, 0),
  durationMinutes: 90,
  objective: 'Mejorar la recepción de saques cortos con efecto',
  status: 'scheduled',
};

const sharedEvents: DashboardEvent[] = [
  {
    id: 'e1',
    type: 'tournament',
    title: 'Torneo Regional',
    date: setTime(addDays(now, 5), 9, 0),
    description: 'Inscripción abierta. Lugar: Polideportivo Norte.',
  },
  {
    id: 'e2',
    type: 'match',
    title: 'Partido amistoso vs. Carlos',
    date: setTime(addDays(now, 2), 19, 30),
    description: 'Partido preparatorio para el torneo.',
  },
  {
    id: 'e3',
    type: 'training',
    title: 'Sessión grupal de footwork',
    date: setTime(addDays(now, 3), 17, 0),
    description: 'Entrenamiento de movimientos en parejas.',
  },
  {
    id: 'e4',
    type: 'evaluation',
    title: 'Evaluación técnica mensual',
    date: setTime(addDays(now, 7), 10, 0),
    description: 'Revisión de progreso y ajuste de objetivos.',
  },
];

const sharedNotes: Note[] = [
  {
    id: 'n1',
    author: 'Pedro Gómez',
    date: addDays(now, -1),
    content:
      'Buen progreso en la recepción de saque. Hay que seguir trabajando la puesta de topspin en el revés.',
    type: 'technical',
  },
  {
    id: 'n2',
    author: 'Juan Pérez',
    date: addDays(now, -3),
    content:
      'La sesión de hoy fue intensa. Noto mejora en la resistencia, pero debo controlar la tensión en los partidos.',
    type: 'tactical',
  },
];

const sharedActivity: Activity[] = [
  {
    id: 'a1',
    type: 'training_completed',
    text: 'Juan completó un entrenamiento.',
    timestamp: addDays(now, -1),
  },
  {
    id: 'a2',
    type: 'note_added',
    text: 'Pedro agregó una nota.',
    timestamp: addDays(now, -1),
  },
  {
    id: 'a3',
    type: 'objective_updated',
    text: "Se actualizó el objetivo 'Mejorar recepción'.",
    timestamp: addDays(now, -2),
  },
  {
    id: 'a4',
    type: 'match_registered',
    text: 'Se registró un nuevo partido.',
    timestamp: addDays(now, -3),
  },
];

const playerObjectives: Objective[] = [
  {
    id: 'o1',
    name: 'Mejorar recepción de saque',
    category: 'technique',
    progress: 72,
    deadline: addDays(now, 30),
    status: 'active',
  },
  {
    id: 'o2',
    name: 'Aumentar resistencia física',
    category: 'physical',
    progress: 45,
    deadline: addDays(now, 45),
    status: 'active',
  },
  {
    id: 'o3',
    name: 'Controlar tensión en competición',
    category: 'mental',
    progress: 60,
    deadline: addDays(now, 21),
    status: 'active',
  },
];

const coachObjectives: Objective[] = [
  {
    id: 'oc1',
    name: 'Revisar progreso de Juan',
    category: 'tactical',
    progress: 80,
    deadline: addDays(now, 5),
    status: 'pending_review',
  },
  {
    id: 'oc2',
    name: 'Planificar torneo regional',
    category: 'tactical',
    progress: 35,
    deadline: addDays(now, 14),
    status: 'active',
  },
  {
    id: 'oc3',
    name: 'Preparar evaluación mensual',
    category: 'technique',
    progress: 50,
    deadline: addDays(now, 7),
    status: 'active',
  },
];

const coachEvents: DashboardEvent[] = [
  {
    id: 'ce1',
    type: 'training',
    title: 'Entrenamiento grupal - Alevines',
    date: setTime(addDays(now, 1), 17, 0),
    description: 'Trabajo de footwork y saque.',
  },
  {
    id: 'ce2',
    type: 'training',
    title: 'Entrenamiento grupal - Cadetes',
    date: setTime(addDays(now, 2), 18, 0),
    description: 'Sesión de contragolpe y bloqueo.',
  },
  {
    id: 'ce3',
    type: 'evaluation',
    title: 'Evaluación de técnica individual',
    date: setTime(addDays(now, 4), 10, 0),
    description: 'Juan Pérez - revisión de golpes.',
  },
];

const coachNotes: Note[] = [
  {
    id: 'cn1',
    author: 'Pedro Gómez',
    date: addDays(now, -1),
    content:
      'Juan mejora rápido la recepción de saque; falta más trabajo en el juego de pies.',
    type: 'technical',
  },
  {
    id: 'cn2',
    author: 'Pedro Gómez',
    date: addDays(now, -4),
    content:
      'Carlos muestra mejor control de tensión en partidos cerrados.',
    type: 'tactical',
  },
];

const coachActivity: Activity[] = [
  {
    id: 'ca1',
    type: 'note_added',
    text: 'Pedro agregó una nota para Juan.',
    timestamp: addDays(now, -1),
  },
  {
    id: 'ca2',
    type: 'objective_updated',
    text: "Se actualizó el objetivo 'Revisar progreso de Juan'.",
    timestamp: addDays(now, -2),
  },
  {
    id: 'ca3',
    type: 'training_completed',
    text: 'El grupo cadete completó un entrenamiento.',
    timestamp: addDays(now, -3),
  },
  {
    id: 'ca4',
    type: 'match_registered',
    text: 'Se registró un partido amistoso para preparación del torneo.',
    timestamp: addDays(now, -4),
  },
];

export function getMockDashboardData(role: UserRole): DashboardData {
  return role === 'coach'
    ? {
        role,
        nextTraining: {
          id: 'ct1',
          title: 'Entrenamiento grupal - Cadetes',
          date: setTime(addDays(now, 1), 18, 0),
          durationMinutes: 120,
          objective: 'Contragolpe y bloqueo en parejas',
          status: 'scheduled',
        },
        objectives: coachObjectives,
        upcomingEvents: coachEvents,
        notes: coachNotes,
        recentActivity: coachActivity,
      }
    : {
        role,
        nextTraining: sharedTraining,
        objectives: playerObjectives,
        upcomingEvents: sharedEvents,
        notes: sharedNotes,
        recentActivity: sharedActivity,
      };
}

export function getEmptyDashboardData(role: UserRole): DashboardData {
  return {
    role,
    nextTraining: null,
    objectives: [],
    upcomingEvents: [],
    notes: [],
    recentActivity: [],
  };
}

export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', name: 'Juan Pérez', category: 'cadete', age: 14, ranking: 62, hand: 'right', level: 'advanced', status: 'active' },
  { id: 'p2', name: 'María López', category: 'infantil', age: 12, ranking: 34, hand: 'left', level: 'intermediate', status: 'active' },
  { id: 'p3', name: 'Carlos Ruiz', category: 'juvenil', age: 17, ranking: 18, hand: 'right', level: 'advanced', status: 'active' },
  { id: 'p4', name: 'Ana Martínez', category: 'cadete', age: 15, ranking: 45, hand: 'right', level: 'intermediate', status: 'injured' },
  { id: 'p5', name: 'Pedro Sánchez', category: 'alevin', age: 10, ranking: 88, hand: 'left', level: 'beginner', status: 'active' },
  { id: 'p6', name: 'Lucía García', category: 'juvenil', age: 16, ranking: 27, hand: 'right', level: 'advanced', status: 'active' },
  { id: 'p7', name: 'Sofía Torres', category: 'infantil', age: 13, ranking: 51, hand: 'right', level: 'intermediate', status: 'inactive' },
  { id: 'p8', name: 'Diego Romero', category: 'senior', age: 24, ranking: 9, hand: 'right', level: 'advanced', status: 'active' },
];

export function getMockPlayers(): Player[] {
  return MOCK_PLAYERS;
}
