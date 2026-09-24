import { addDays, startOfWeek } from '../../core/date/calendar-dates';
import {
  Macrocycle,
  Mesocycle,
  MesocyclePhase,
  MicrocycleDay,
  TrainingLoad,
  WorkType,
} from './atleta.models';

export const MESOCYCLE_PHASE_LABELS: Record<MesocyclePhase, string> = {
  'preparatorio-general': 'Preparatorio general',
  'preparatorio-especifico': 'Preparatorio específico',
  precompetitivo: 'Precompetitivo',
  competitivo: 'Competitivo',
  transicion: 'Transición',
};

export const PHASE_OPTIONS: readonly MesocyclePhase[] = [
  'preparatorio-general',
  'preparatorio-especifico',
  'precompetitivo',
  'competitivo',
  'transicion',
];

/** Color del badge y de la barra de la línea de tiempo, uno por fase. */
export const MESOCYCLE_PHASE_CLASSES: Record<MesocyclePhase, string> = {
  'preparatorio-general': 'bg-sky-100 text-sky-800',
  'preparatorio-especifico': 'bg-blue-100 text-blue-800',
  precompetitivo: 'bg-amber-100 text-amber-800',
  competitivo: 'bg-red-100 text-red-800',
  transicion: 'bg-gray-100 text-gray-600',
};

export const MESOCYCLE_PHASE_BAR_CLASSES: Record<MesocyclePhase, string> = {
  'preparatorio-general': 'bg-sky-400',
  'preparatorio-especifico': 'bg-blue-500',
  precompetitivo: 'bg-amber-500',
  competitivo: 'bg-red-500',
  transicion: 'bg-gray-400',
};

export const TRAINING_LOAD_LABELS: Record<TrainingLoad, string> = {
  descanso: 'Descanso',
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  'muy-alta': 'Muy alta',
};

export const LOAD_OPTIONS: readonly TrainingLoad[] = [
  'descanso',
  'baja',
  'media',
  'alta',
  'muy-alta',
];

export const TRAINING_LOAD_CLASSES: Record<TrainingLoad, string> = {
  descanso: 'bg-gray-100 text-gray-500',
  baja: 'bg-emerald-100 text-emerald-700',
  media: 'bg-brand-100 text-brand-700',
  alta: 'bg-amber-100 text-amber-800',
  'muy-alta': 'bg-red-100 text-red-700',
};

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  tecnica: 'Técnica',
  tactica: 'Táctica',
  fisica: 'Física',
  competencia: 'Competencia',
  recuperacion: 'Recuperación',
};

export const WORK_TYPE_OPTIONS: readonly WorkType[] = [
  'tecnica',
  'tactica',
  'fisica',
  'competencia',
  'recuperacion',
];

/** Carga dominante de cada fase; el pico de volumen se ajusta luego en `buildMesocycles`. */
const PHASE_LOAD: Record<MesocyclePhase, TrainingLoad> = {
  'preparatorio-general': 'media',
  'preparatorio-especifico': 'alta',
  precompetitivo: 'alta',
  competitivo: 'media',
  transicion: 'baja',
};

const PHASE_GOAL: Record<MesocyclePhase, string> = {
  'preparatorio-general': 'Base física y volumen de juego: acumular trabajo general.',
  'preparatorio-especifico': 'Trabajo específico del estilo de juego con alta exigencia.',
  precompetitivo: 'Afinar táctica y simular competencia bajando el volumen.',
  competitivo: 'Llegar en pico de forma: mantener intensidad y priorizar el descanso.',
  transicion: 'Descarga activa y evaluación del ciclo.',
};

function day(
  weekday: MicrocycleDay['weekday'],
  load: TrainingLoad,
  workType: WorkType | null,
  goal: string,
): MicrocycleDay {
  return { weekday, load, workType, goal };
}

/**
 * Microciclo tipo de cada fase: define el día a día de las semanas del mesociclo. El
 * entrenador lo ajusta después, pero de arranque ya expresa la lógica de la fase (más
 * físico y volumen al principio, más táctica y descanso cerca de la competencia).
 */
const MICROCYCLE_TEMPLATES: Record<MesocyclePhase, MicrocycleDay[]> = {
  'preparatorio-general': [
    day(1, 'alta', 'fisica', 'Fuerza general y movilidad.'),
    day(2, 'media', 'tecnica', 'Multibola: consistencia de derecha.'),
    day(3, 'alta', 'fisica', 'Resistencia aeróbica y desplazamientos.'),
    day(4, 'media', 'tecnica', 'Multibola: consistencia de revés.'),
    day(5, 'alta', 'tecnica', 'Volumen de juego con variación de efectos.'),
    day(6, 'baja', 'tactica', 'Partidos de práctica sin marcador.'),
    day(7, 'descanso', null, 'Descanso total.'),
  ],
  'preparatorio-especifico': [
    day(1, 'alta', 'tecnica', 'Esquemas de ataque propios del estilo.'),
    day(2, 'alta', 'fisica', 'Fuerza explosiva y pliometría.'),
    day(3, 'muy-alta', 'tecnica', 'Series largas a alta intensidad.'),
    day(4, 'media', 'tactica', 'Saque y tercera bola.'),
    day(5, 'alta', 'tecnica', 'Recepción y contraataque.'),
    day(6, 'media', 'tactica', 'Sparring con distintos estilos.'),
    day(7, 'descanso', null, 'Descanso total.'),
  ],
  precompetitivo: [
    day(1, 'media', 'tactica', 'Planes de partido ante rivales tipo.'),
    day(2, 'alta', 'tecnica', 'Intensidad alta, volumen reducido.'),
    day(3, 'media', 'fisica', 'Velocidad y reacción.'),
    day(4, 'media', 'tactica', 'Simulación de partidos con marcador.'),
    day(5, 'baja', 'tecnica', 'Ajustes finos y saques.'),
    day(6, 'alta', 'competencia', 'Torneo o partidos de test.'),
    day(7, 'descanso', null, 'Descanso total.'),
  ],
  competitivo: [
    day(1, 'baja', 'recuperacion', 'Descarga tras competir.'),
    day(2, 'media', 'tecnica', 'Mantenimiento técnico, series cortas.'),
    day(3, 'media', 'tactica', 'Correcciones del último partido.'),
    day(4, 'baja', 'tecnica', 'Saques y devoluciones.'),
    day(5, 'baja', 'recuperacion', 'Activación previa a competir.'),
    day(6, 'muy-alta', 'competencia', 'Competencia.'),
    day(7, 'media', 'competencia', 'Competencia o vuelta a la calma.'),
  ],
  transicion: [
    day(1, 'descanso', null, 'Descanso.'),
    day(2, 'baja', 'recuperacion', 'Actividad alternativa (bici, natación).'),
    day(3, 'descanso', null, 'Descanso.'),
    day(4, 'baja', 'tecnica', 'Juego libre y lúdico.'),
    day(5, 'descanso', null, 'Descanso.'),
    day(6, 'baja', 'recuperacion', 'Movilidad y core.'),
    day(7, 'descanso', null, 'Descanso.'),
  ],
};

/** Datos que define el entrenador; los ciclos internos se generan a partir de esto. */
export interface MacrocycleInput {
  name: string;
  startDate: Date;
  endDate: Date;
  targetEvent: string;
  targetDate: Date | null;
  goal: string;
  /** Semanas de cada mesociclo (4 es lo habitual). */
  weeksPerMesocycle: number;
}

/** Semanas completas que abarca un bloque de fechas (mínimo 1). */
export function weeksBetween(start: Date, end: Date): number {
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.round(days / 7));
}

/**
 * Reparte los bloques en fases según su posición respecto del objetivo: el bloque que
 * contiene la fecha del objetivo es el competitivo, el anterior el precompetitivo, los
 * previos se dividen entre preparatorio general (los primeros ~60 %) y específico, y lo
 * que quede después del objetivo es transición.
 */
function phaseOf(index: number, competitiveIndex: number): MesocyclePhase {
  if (index > competitiveIndex) return 'transicion';
  if (index === competitiveIndex) return 'competitivo';
  if (index === competitiveIndex - 1) return 'precompetitivo';

  const preparatoryBlocks = Math.max(1, competitiveIndex - 1);
  return index < Math.ceil(preparatoryBlocks * 0.6)
    ? 'preparatorio-general'
    : 'preparatorio-especifico';
}

/**
 * Divide el macrociclo en mesociclos de `weeksPerMesocycle` semanas (el último puede ser
 * más corto) y le asigna a cada uno fase, carga y microciclo tipo. El pico de carga queda
 * en el último bloque específico, justo antes de empezar a afinar.
 */
function buildMesocycles(input: MacrocycleInput): Mesocycle[] {
  const weeks = Math.max(1, Math.trunc(input.weeksPerMesocycle));
  const planStart = startOfWeek(input.startDate);
  const planEnd = input.endDate;

  const blocks: { start: Date; end: Date }[] = [];
  for (let start = planStart; start.getTime() <= planEnd.getTime();) {
    const blockEnd = addDays(start, weeks * 7 - 1);
    blocks.push({ start, end: blockEnd.getTime() > planEnd.getTime() ? planEnd : blockEnd });
    start = addDays(blockEnd, 1);
  }

  const target = input.targetDate;
  const targetIndex = target
    ? blocks.findIndex((block) => target.getTime() <= block.end.getTime())
    : -1;
  const competitiveIndex = targetIndex === -1 ? blocks.length - 1 : targetIndex;

  const phases = blocks.map((_, index) => phaseOf(index, competitiveIndex));
  const lastSpecific = phases.lastIndexOf('preparatorio-especifico');

  return blocks.map((block, index) => {
    const phase = phases[index];
    return {
      id: index + 1,
      name: `Mesociclo ${index + 1}`,
      phase,
      startDate: block.start,
      endDate: block.end,
      // El cierre del bloque específico concentra el mayor volumen del macrociclo.
      load: index === lastSpecific ? 'muy-alta' : PHASE_LOAD[phase],
      goal: PHASE_GOAL[phase],
      microcycle: MICROCYCLE_TEMPLATES[phase].map((microcycleDay) => ({ ...microcycleDay })),
    };
  });
}

/** Arma el macrociclo completo (con sus mesociclos y microciclos) a partir de los datos del entrenador. */
export function buildMacrocycle(id: number, input: MacrocycleInput): Macrocycle {
  return {
    id,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    targetEvent: input.targetEvent,
    targetDate: input.targetDate,
    goal: input.goal,
    mesocycles: buildMesocycles(input),
  };
}
