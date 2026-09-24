import { Injectable, signal } from '@angular/core';

/**
 * Nivel de juego. Se ordena de más fuerte a más novato:
 * 0 = Atleta Elite, 1..8 = categorías numéricas (1 es la más alta), 9 = Infantil.
 */
export type Category = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Categoría especial de alto rendimiento, por encima de la 1ra. */
export const ELITE_CATEGORY: Category = 0;
/** Categoría especial de las categorías formativas, por debajo de la 8va. */
export const INFANTIL_CATEGORY: Category = 9;

/** Categorías disponibles en selects y chips de filtro, de élite a infantil. */
export const CATEGORY_OPTIONS: readonly Category[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Etiqueta legible de una categoría ('Atleta Elite', 'Cat 3', 'Infantil'). */
export function categoryLabel(category: Category): string {
  if (category === ELITE_CATEGORY) return 'Atleta Elite';
  if (category === INFANTIL_CATEGORY) return 'Infantil';
  return `Cat ${category}`;
}

/** Clases del badge de categoría: élite destaca en violeta, 1 en ámbar, 2-3 azul, 4-5 brand, 6-8 gris, infantil celeste. */
export function categoryBadgeClasses(category: Category): string {
  if (category === ELITE_CATEGORY) return 'bg-violet-100 text-violet-800 ring-1 ring-violet-300';
  if (category === INFANTIL_CATEGORY) return 'bg-sky-100 text-sky-700';
  if (category === 1) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-300';
  if (category <= 3) return 'bg-blue-100 text-blue-700';
  if (category <= 5) return 'bg-brand-100 text-brand-700';
  return 'bg-gray-100 text-gray-600';
}

/** Las categorías 0 (élite) y 1 (primera) tienen ficha de seguimiento de alto rendimiento. */
export function isEliteCategory(category: Category): boolean {
  return category === ELITE_CATEGORY || category === 1;
}

/** Nivel declarado del jugador: define qué datos técnicos se le piden en el formulario. */
export type PlayerLevel = 'principiante' | 'intermedio' | 'avanzado';

/** Empuñadura de la paleta. `null` cuando el jugador es principiante y no la tiene definida. */
export type PaddleGrip = 'clasica' | 'lapicero';

/** Estilo de juego declarado por el jugador. */
export type PlayingStyle = 'ofensivo' | 'defensivo' | 'all-round' | 'bloqueador';

/** Tipo de goma montada en una cara de la paleta. */
export type RubberType = 'liso' | 'pupo-corto' | 'pupo-largo' | 'antitopspin';

/** Día de la semana: 1 = lunes … 7 = domingo (mismo criterio que `TrainingDayPlan`). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Etiquetas cortas de los días de la semana, indexadas por `Weekday`. */
export const WEEKDAY_OPTIONS: readonly { value: Weekday; label: string; short: string }[] = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
];

export const PLAYER_LEVEL_LABELS: Record<PlayerLevel, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const PLAYING_STYLE_LABELS: Record<PlayingStyle, string> = {
  ofensivo: 'Ofensivo',
  defensivo: 'Defensivo',
  'all-round': 'All-round',
  bloqueador: 'Bloqueador',
};

export const RUBBER_TYPE_LABELS: Record<RubberType, string> = {
  liso: 'Liso',
  'pupo-corto': 'Pupo corto',
  'pupo-largo': 'Pupo largo',
  antitopspin: 'Antitopspin',
};

export const PADDLE_GRIP_LABELS: Record<PaddleGrip, string> = {
  clasica: 'Clásica',
  lapicero: 'Lapicero',
};

/** Etiqueta de un valor opcional del perfil de juego; muestra "Sin especificar" si falta. */
function optionalLabel<T extends string>(
  value: T | null | undefined,
  labels: Record<T, string>,
): string {
  return value ? labels[value] : 'Sin especificar';
}

export function paddleGripLabel(grip: PaddleGrip | null | undefined): string {
  return optionalLabel(grip, PADDLE_GRIP_LABELS);
}

export function playingStyleLabel(style: PlayingStyle | null | undefined): string {
  return optionalLabel(style, PLAYING_STYLE_LABELS);
}

export function rubberTypeLabel(rubber: RubberType | null | undefined): string {
  return optionalLabel(rubber, RUBBER_TYPE_LABELS);
}

/** Lista legible de días de entrenamiento ("Lun · Mié · Vie"); vacío devuelve "Sin acordar". */
export function trainingDaysLabel(days: readonly Weekday[] | null | undefined): string {
  if (!days || days.length === 0) return 'Sin acordar';
  return WEEKDAY_OPTIONS.filter((option) => days.includes(option.value))
    .map((option) => option.short)
    .join(' · ');
}

/** Perfil técnico del jugador: qué se le pide depende de su `level`. */
export interface PlayingProfile {
  level: PlayerLevel;
  /** Desde nivel intermedio. */
  paddleGrip: PaddleGrip | null;
  /** Desde nivel intermedio. */
  rubberForehand: RubberType | null;
  /** Desde nivel intermedio. */
  rubberBackhand: RubberType | null;
  /** Desde nivel intermedio. */
  playingStyle: PlayingStyle | null;
  /** Solo nivel avanzado. */
  club: string | null;
  /** Solo nivel avanzado. */
  specificGoal: string | null;
  /** Días acordados con el entrenador. */
  trainingDays: Weekday[];
}

/** Respuestas del formulario de bienvenida que completa el jugador en su primer login. */
export interface WelcomeFormAnswers {
  // Sección 1: Objetivos
  mainGoal: 'competir' | 'mejorar-tecnica' | 'socializar' | 'mantenerse-en-forma' | 'otro';
  shortTermGoal: string;
  longTermGoal: string;
  // Sección 2: Motivación
  motivation: string;
  coachSupport: string;
  // Sección 3: Experiencia previa
  yearsPlaying: 'menos-de-1' | '1-a-3' | '3-a-5' | 'mas-de-5';
  hasCompeted: boolean;
  selfPerceivedLevel: PlayerLevel;
  // Sección 3 (condicional): perfil de juego según el nivel autopercibido.
  paddleGrip: PaddleGrip | null;
  rubberForehand: RubberType | null;
  rubberBackhand: RubberType | null;
  playingStyle: PlayingStyle | null;
  club: string | null;
  specificGoal: string | null;
  trainingDays: Weekday[];
}

export interface Athlete extends PlayingProfile {
  id: number;
  firstName: string;
  lastName: string;
  category: Category;
  status: 'activo' | 'inactivo';
  playerType: 'regular' | 'invitado';
  phone: string;
  username: string;
  tempPassword: string;
  attendance: number;
  birthDate: Date;
  dominantHand: 'derecha' | 'izquierda';
  /** Indica si el jugador ya completó el formulario de bienvenida (objetivos/motivación/experiencia). */
  welcomeFormCompleted: boolean;
  welcomeForm: WelcomeFormAnswers | null;
}

export type NewAthleteInput = Pick<
  Athlete,
  | 'firstName'
  | 'lastName'
  | 'category'
  | 'birthDate'
  | 'dominantHand'
  | 'phone'
  | 'playerType'
  | 'level'
  | 'paddleGrip'
  | 'rubberForehand'
  | 'rubberBackhand'
  | 'playingStyle'
  | 'club'
  | 'specificGoal'
  | 'trainingDays'
>;

/** Normaliza un texto quitando tildes/espacios y pasándolo a minúsculas, para armar usernames. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '');
}

const STORAGE_KEY = 'tt-trainer-players';

function reserveUsername(firstName: string, lastName: string, used: Set<string>): string {
  const base = `${normalize(firstName)}.${normalize(lastName)}`;
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}${suffix}`;
    suffix++;
  }
  used.add(candidate);
  return candidate;
}

function randomAlnum(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const DEMO_PLAYING_STYLES: readonly PlayingStyle[] = [
  'ofensivo',
  'all-round',
  'defensivo',
  'bloqueador',
];

/** Respuestas de bienvenida de demo, para los jugadores que ya la completaron. */
function demoWelcomeForm(athlete: Athlete): WelcomeFormAnswers {
  return {
    mainGoal: 'competir',
    shortTermGoal: 'Ganar consistencia en el saque y la devolución.',
    longTermGoal: 'Subir de categoría en la próxima temporada.',
    motivation: 'Competir en el circuito con el club.',
    coachSupport: 'Corrección técnica y planificación semanal.',
    yearsPlaying: '3-a-5',
    hasCompeted: true,
    selfPerceivedLevel: athlete.level,
    paddleGrip: athlete.paddleGrip,
    rubberForehand: athlete.rubberForehand,
    rubberBackhand: athlete.rubberBackhand,
    playingStyle: athlete.playingStyle,
    club: athlete.club,
    specificGoal: athlete.specificGoal,
    trainingDays: athlete.trainingDays,
  };
}

/**
 * Ficha de demo. Los datos técnicos se recortan al nivel declarado igual que en un alta
 * real (un principiante no tiene paleta, gomas ni estilo definidos).
 */
function demoAthlete(
  id: number,
  firstName: string,
  lastName: string,
  category: Category,
  level: PlayerLevel,
  trainingDays: Weekday[],
): Athlete {
  const advanced = level === 'avanzado';
  const intermediateOrAbove = advanced || level === 'intermedio';

  return {
    id,
    firstName,
    lastName,
    category,
    status: 'activo',
    playerType: 'regular',
    phone: `+54 9 11 4000-${String(1000 + id).padStart(4, '0')}`,
    username: `${normalize(firstName)}.${normalize(lastName)}`,
    tempPassword: `TM-2026-DM${String(id).padStart(2, '0')}`,
    attendance: 65 + ((id * 7) % 35),
    birthDate: new Date(1998 + (id % 12), (id * 5) % 12, 1 + (id % 27)),
    dominantHand: id % 4 === 0 ? 'izquierda' : 'derecha',
    level,
    paddleGrip: intermediateOrAbove ? (id % 3 === 0 ? 'lapicero' : 'clasica') : null,
    rubberForehand: intermediateOrAbove ? 'liso' : null,
    rubberBackhand: intermediateOrAbove ? (id % 2 === 0 ? 'pupo-corto' : 'liso') : null,
    playingStyle: intermediateOrAbove ? DEMO_PLAYING_STYLES[id % DEMO_PLAYING_STYLES.length] : null,
    club: advanced ? 'Club Atlético Norte' : null,
    specificGoal: advanced ? 'Clasificar al Provincial 2026' : null,
    trainingDays,
    welcomeFormCompleted: false,
    welcomeForm: null,
  };
}

/**
 * Plantel de demo con categorías variadas (de Atleta Elite a Infantil). Se siembra solo
 * cuando no hay nada guardado, para poder probar los turnos y los avisos de cupo liberado
 * sin dar de alta a nadie a mano. Los ids y nombres coinciden con los jugadores mock del
 * calendario, así las asistencias sembradas allí apuntan a estas mismas fichas.
 */
function buildDemoAthletes(): Athlete[] {
  const athletes = [
    demoAthlete(1, 'Matías', 'Fernández', 1, 'avanzado', [1, 2, 3, 4, 5]),
    demoAthlete(2, 'Sofía', 'Rojas', 2, 'avanzado', [1, 3, 5]),
    demoAthlete(3, 'Diego', 'Vargas', 3, 'intermedio', [2, 4]),
    demoAthlete(4, 'Camila', 'Torres', 3, 'intermedio', [1, 3, 5]),
    demoAthlete(5, 'Ignacio', 'Soto', 4, 'intermedio', [2, 4, 6]),
    demoAthlete(6, 'Valentina', 'Muñoz', 4, 'intermedio', [1, 4]),
    demoAthlete(7, 'Benjamín', 'Castro', 5, 'principiante', [3, 5]),
    demoAthlete(8, 'Antonia', 'Reyes', 6, 'principiante', [2, 6]),
    demoAthlete(9, 'Tomás', 'Aguirre', 0, 'avanzado', [1, 2, 3, 4, 5, 6]),
    demoAthlete(10, 'Martina', 'Paz', 9, 'principiante', [6]),
  ];

  // Los tres de mayor nivel ya completaron el formulario de bienvenida; el resto queda pendiente.
  return athletes.map((athlete) =>
    [1, 2, 9].includes(athlete.id)
      ? { ...athlete, welcomeFormCompleted: true, welcomeForm: demoWelcomeForm(athlete) }
      : athlete,
  );
}

@Injectable({ providedIn: 'root' })
export class PlayersService {
  private readonly _athletes = signal<Athlete[]>(this.readStored());
  readonly athletes = this._athletes.asReadonly();

  private readonly usedUsernames = new Set(this._athletes().map((a) => a.username));

  /** Crea un nuevo jugador generando automáticamente su usuario y clave temporal. */
  addAthlete(input: NewAthleteInput): Athlete {
    const newAthlete: Athlete = {
      id: Math.max(0, ...this._athletes().map((a) => a.id)) + 1,
      firstName: input.firstName,
      lastName: input.lastName,
      category: input.category,
      status: 'activo',
      playerType: input.playerType,
      phone: input.phone,
      username: reserveUsername(input.firstName, input.lastName, this.usedUsernames),
      tempPassword: `TM-2026-${randomAlnum(4)}`,
      attendance: 0,
      birthDate: input.birthDate,
      dominantHand: input.dominantHand,
      ...this.profileOf(input),
      welcomeFormCompleted: false,
      welcomeForm: null,
    };

    this._athletes.update((list) => [...list, newAthlete]);
    this.persist();
    return newAthlete;
  }

  /** Actualiza los datos editables de un jugador existente (no toca usuario/clave/estado/asistencia). */
  updateAthlete(athleteId: number, input: NewAthleteInput): void {
    this._athletes.update((list) =>
      list.map((athlete) =>
        athlete.id === athleteId
          ? {
              ...athlete,
              firstName: input.firstName,
              lastName: input.lastName,
              category: input.category,
              phone: input.phone,
              playerType: input.playerType,
              birthDate: input.birthDate,
              dominantHand: input.dominantHand,
              ...this.profileOf(input),
            }
          : athlete,
      ),
    );
    this.persist();
  }

  /**
   * Guarda las respuestas del formulario de bienvenida, lo marca como completado y
   * sincroniza el perfil técnico declarado por el jugador en su propia ficha.
   */
  submitWelcomeForm(athleteId: number, answers: WelcomeFormAnswers): void {
    this._athletes.update((list) =>
      list.map((athlete) =>
        athlete.id === athleteId
          ? {
              ...athlete,
              welcomeForm: answers,
              welcomeFormCompleted: true,
              level: answers.selfPerceivedLevel,
              paddleGrip: answers.paddleGrip,
              rubberForehand: answers.rubberForehand,
              rubberBackhand: answers.rubberBackhand,
              playingStyle: answers.playingStyle,
              club: answers.club,
              specificGoal: answers.specificGoal,
              // El entrenador es quien acuerda los días: solo se toman los del jugador si aún no hay ninguno.
              trainingDays:
                athlete.trainingDays.length > 0 ? athlete.trainingDays : answers.trainingDays,
            }
          : athlete,
      ),
    );
    this.persist();
  }

  /** True si el jugador existe y todavía no completó el formulario de bienvenida. */
  isWelcomeFormPending(athleteId: number): boolean {
    const athlete = this._athletes().find((a) => a.id === athleteId);
    return athlete !== undefined && !athlete.welcomeFormCompleted;
  }

  /** Alterna el estado activo/inactivo de un jugador (no se elimina de la base de datos). */
  toggleStatus(athleteId: number): void {
    this._athletes.update((list) =>
      list.map((athlete) =>
        athlete.id === athleteId
          ? { ...athlete, status: athlete.status === 'activo' ? 'inactivo' : 'activo' }
          : athlete,
      ),
    );
    this.persist();
  }

  findByUsername(username: string): Athlete | undefined {
    return this._athletes().find((athlete) => athlete.username === username);
  }

  /** Recorta el perfil técnico al nivel declarado: lo que no aplica se guarda como `null`. */
  private profileOf(input: NewAthleteInput): PlayingProfile {
    const isIntermediateOrAbove = input.level === 'intermedio' || input.level === 'avanzado';
    const isAdvanced = input.level === 'avanzado';
    return {
      level: input.level,
      paddleGrip: isIntermediateOrAbove ? input.paddleGrip : null,
      rubberForehand: isIntermediateOrAbove ? input.rubberForehand : null,
      rubberBackhand: isIntermediateOrAbove ? input.rubberBackhand : null,
      playingStyle: isIntermediateOrAbove ? input.playingStyle : null,
      club: isAdvanced ? input.club : null,
      specificGoal: isAdvanced ? input.specificGoal : null,
      trainingDays: [...input.trainingDays].sort((a, b) => a - b),
    };
  }

  /** Persiste la lista completa de jugadores en localStorage para que sobreviva a recargas. */
  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._athletes()));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.): se ignora silenciosamente.
    }
  }

  /** Lee la lista de jugadores guardada; si no hay nada o está corrupta, usa el plantel de demo. */
  private readStored(): Athlete[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDemoAthletes();
    try {
      const parsed = JSON.parse(raw) as Athlete[];
      if (!Array.isArray(parsed)) return buildDemoAthletes();
      return parsed.map((athlete) => this.hydrate(athlete));
    } catch {
      return [];
    }
  }

  /**
   * Normaliza un registro guardado antes de que el perfil de juego existiera: rellena los
   * campos nuevos con valores por defecto para que las plantillas nunca reciban `undefined`.
   */
  private hydrate(stored: Athlete): Athlete {
    return {
      ...stored,
      birthDate: new Date(stored.birthDate),
      level: stored.level ?? 'intermedio',
      paddleGrip: stored.paddleGrip ?? null,
      rubberForehand: stored.rubberForehand ?? null,
      rubberBackhand: stored.rubberBackhand ?? null,
      playingStyle: stored.playingStyle ?? null,
      club: stored.club ?? null,
      specificGoal: stored.specificGoal ?? null,
      trainingDays: stored.trainingDays ?? [],
    };
  }
}
