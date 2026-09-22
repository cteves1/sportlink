/**
 * Datos mockeados del avance del atleta. Representan la progresión que el entrenador ve
 * crecer a medida que el jugador va entrenando; se reemplazarán por datos reales del backend.
 */

/** Rango temporal que se puede elegir en el gráfico del Home. */
export type ProgressRange = '8-semanas' | '6-meses';

/** Punto de avance en un período (semana o mes). */
export interface ProgressPoint {
  label: string;
  /** Porcentaje de asistencia a los entrenamientos del período. */
  attendanceRate: number;
  /** Puntaje técnico (0-100) que asigna el entrenador. */
  skillScore: number;
  /** Horas de mesa acumuladas en el período. */
  tableHours: number;
}

/** Últimas 8 semanas: progresión sostenida con una meseta a mitad de camino. */
const LAST_8_WEEKS: ProgressPoint[] = [
  { label: 'Sem 1', attendanceRate: 60, skillScore: 48, tableHours: 3 },
  { label: 'Sem 2', attendanceRate: 75, skillScore: 52, tableHours: 4 },
  { label: 'Sem 3', attendanceRate: 70, skillScore: 55, tableHours: 4 },
  { label: 'Sem 4', attendanceRate: 85, skillScore: 58, tableHours: 5 },
  { label: 'Sem 5', attendanceRate: 80, skillScore: 57, tableHours: 4 },
  { label: 'Sem 6', attendanceRate: 90, skillScore: 63, tableHours: 6 },
  { label: 'Sem 7', attendanceRate: 95, skillScore: 67, tableHours: 6 },
  { label: 'Sem 8', attendanceRate: 100, skillScore: 72, tableHours: 7 },
];

/** Últimos 6 meses: la misma tendencia vista en grueso. */
const LAST_6_MONTHS: ProgressPoint[] = [
  { label: 'Abr', attendanceRate: 55, skillScore: 40, tableHours: 12 },
  { label: 'May', attendanceRate: 68, skillScore: 46, tableHours: 15 },
  { label: 'Jun', attendanceRate: 72, skillScore: 53, tableHours: 17 },
  { label: 'Jul', attendanceRate: 84, skillScore: 58, tableHours: 20 },
  { label: 'Ago', attendanceRate: 88, skillScore: 65, tableHours: 22 },
  { label: 'Sep', attendanceRate: 96, skillScore: 72, tableHours: 24 },
];

export const PROGRESS_BY_RANGE: Record<ProgressRange, ProgressPoint[]> = {
  '8-semanas': LAST_8_WEEKS,
  '6-meses': LAST_6_MONTHS,
};

export const PROGRESS_RANGE_LABELS: Record<ProgressRange, string> = {
  '8-semanas': '8 semanas',
  '6-meses': '6 meses',
};
