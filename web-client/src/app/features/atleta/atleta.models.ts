/** Lugar donde se desarrolla una actividad del plan semanal del atleta élite. */
export type TrainingLocation = 'cenard' | 'club' | 'particular' | 'gimnasio' | 'casa';

/** Actividad concreta dentro de un día del plan semanal (turno de mesa, saques, físico, etc.). */
export interface TrainingActivity {
  label: string;
  location: TrainingLocation;
  /** Duración de cada sesión en minutos. */
  durationMin: number;
  /** Cantidad de sesiones del mismo tipo en el día (ej.: "CENARD x2" = 2). */
  sessions: number;
}

/** Plan de un día de la semana: 1 = lunes … 7 = domingo (mismo orden que las grillas de calendario). */
export interface TrainingDayPlan {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  activities: TrainingActivity[];
}

/** Estado de un día planificado dentro de la asistencia mensual del atleta. */
export type AttendanceDayStatus = 'presente' | 'ausente' | 'justificado' | 'competencia' | 'descanso';

/** Asistencia de un día concreto, indexada por clave 'yyyy-mm-dd'. */
export interface AttendanceDay {
  dateKey: string;
  status: AttendanceDayStatus;
  note?: string;
}

/** Nivel del torneo, usado para el badge de la planilla de competencia. */
export type CompetitionLevel = 'club' | 'regional' | 'nacional' | 'internacional';

/** Partido jugado dentro de un torneo. */
export interface CompetitionMatch {
  round: string;
  opponent: string;
  result: 'victoria' | 'derrota';
  /** Marcador en sets, ej.: "3-1 (11-8, 9-11, 11-6, 11-7)". */
  score: string;
}

/** Torneo disputado por el atleta, con su resultado y el detalle de partidos. */
export interface Competition {
  id: number;
  name: string;
  level: CompetitionLevel;
  date: Date;
  city: string;
  /** Categoría/cuadro en el que participó, ej.: "Sub-19" o "Primera". */
  draw: string;
  /** Puesto obtenido, ej.: "Campeón", "Semifinal", "3.º puesto". */
  placement: string;
  matches: CompetitionMatch[];
  notes?: string;
}

/** Objetivos del atleta para un mes del calendario anual (0 = enero … 11 = diciembre). */
export interface AnnualGoal {
  month: number;
  shortTerm: string;
  mediumTerm: string;
  longTerm: string;
}

/** Equipamiento declarado del atleta. */
export interface EquipmentInfo {
  blade: string;
  rubberForehand: string;
  rubberBackhand: string;
  ballBrand: string;
}

/** Datos del club del atleta y de su entrenador local. */
export interface ClubInfo {
  name: string;
  venue: string;
  city: string;
  localCoach: string;
  coachPhone: string;
  memberSince: number;
}

/** Ficha de seguimiento completa de un atleta de categoría 1 (élite). */
export interface EliteAthleteProfile {
  athleteId: number;
  /** Año al que corresponden la asistencia y el calendario anual. */
  year: number;
  equipment: EquipmentInfo;
  club: ClubInfo;
  weeklyPlan: TrainingDayPlan[];
  attendance: AttendanceDay[];
  competitions: Competition[];
  annualGoals: AnnualGoal[];
}
