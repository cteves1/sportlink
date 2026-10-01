import { Injectable, inject, signal } from '@angular/core';
import { dateKey } from '../date/calendar-dates';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';

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
  email: string | null;
  username: string;
  tempPassword: string;
  attendance: number;
  birthDate: Date;
  dominantHand: 'derecha' | 'izquierda';
  /** Indica si el jugador ya completó el flujo inicial de email + contraseña. */
  setupCompleted: boolean;
  /** Indica si el jugador ya completó el formulario de bienvenida (objetivos/motivación/experiencia). */
  welcomeFormCompleted: boolean;
  welcomeForm: WelcomeFormAnswers | null;
  /** Estado de pago del mes/año corriente. */
  paid: boolean;
  /** Deuda pendiente en la moneda del club (ej. ARS). */
  debt: number;
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

interface DbWelcomeForm {
  main_goal: WelcomeFormAnswers['mainGoal'];
  short_term_goal: string;
  long_term_goal: string;
  motivation: string;
  coach_support: string;
  years_playing: WelcomeFormAnswers['yearsPlaying'];
  has_competed: boolean;
  self_perceived_level: PlayerLevel;
  paddle_grip: PaddleGrip | null;
  rubber_forehand: RubberType | null;
  rubber_backhand: RubberType | null;
  playing_style: PlayingStyle | null;
  club: string | null;
  specific_goal: string | null;
  training_days: Weekday[];
}

interface DbAthlete {
  id: number;
  user_id: string | null;
  first_name: string;
  last_name: string;
  category: Category;
  status: Athlete['status'];
  player_type: Athlete['playerType'];
  phone: string;
  email: string | null;
  username: string;
  temp_password: string;
  attendance_rate: number;
  birth_date: string;
  dominant_hand: Athlete['dominantHand'];
  level: PlayerLevel;
  paddle_grip: PaddleGrip | null;
  rubber_forehand: RubberType | null;
  rubber_backhand: RubberType | null;
  playing_style: PlayingStyle | null;
  club: string | null;
  specific_goal: string | null;
  training_days: Weekday[];
  setup_completed: boolean;
  welcome_form_completed: boolean;
  welcome_form_answers: DbWelcomeForm[] | null;
  paid: boolean | null;
  debt: number | null;
}

/** Normaliza un texto quitando tildes/espacios y pasándolo a minúsculas, para armar usernames. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '');
}

function randomAlnum(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function fromDbRow(row: DbAthlete): Athlete {
  const welcomeAnswers = Array.isArray(row.welcome_form_answers)
    ? row.welcome_form_answers[0]
    : row.welcome_form_answers;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    category: row.category,
    status: row.status,
    playerType: row.player_type,
    phone: row.phone,
    email: row.email,
    username: row.username,
    tempPassword: row.temp_password,
    attendance: Number(row.attendance_rate),
    birthDate: new Date(row.birth_date),
    dominantHand: row.dominant_hand,
    setupCompleted: row.setup_completed,
    level: row.level,
    paddleGrip: row.paddle_grip,
    rubberForehand: row.rubber_forehand,
    rubberBackhand: row.rubber_backhand,
    playingStyle: row.playing_style,
    club: row.club,
    specificGoal: row.specific_goal,
    trainingDays: row.training_days,
    welcomeFormCompleted: row.welcome_form_completed,
    welcomeForm: welcomeAnswers ? fromDbWelcomeForm(welcomeAnswers) : null,
    paid: row.paid ?? false,
    debt: row.debt ?? 0,
  };
}

function athleteFromInput(id: number, input: NewAthleteInput, username: string, tempPassword: string): Athlete {
  const profile = profileOf(input);
  const row: DbAthlete = {
    id,
    user_id: null,
    first_name: input.firstName,
    last_name: input.lastName,
    category: input.category,
    status: 'activo',
    player_type: input.playerType,
    phone: input.phone,
    email: null,
    username,
    temp_password: tempPassword,
    attendance_rate: 0,
    birth_date: dateKey(input.birthDate),
    dominant_hand: input.dominantHand,
    setup_completed: false,
    level: profile.level,
    paddle_grip: profile.paddle_grip,
    rubber_forehand: profile.rubber_forehand,
    rubber_backhand: profile.rubber_backhand,
    playing_style: profile.playing_style,
    club: profile.club,
    specific_goal: profile.specific_goal,
    training_days: profile.training_days,
    welcome_form_completed: false,
    welcome_form_answers: [],
    paid: false,
    debt: 0,
  };
  return fromDbRow(row);
}

function fromDbWelcomeForm(row: DbWelcomeForm): WelcomeFormAnswers {
  return {
    mainGoal: row.main_goal,
    shortTermGoal: row.short_term_goal,
    longTermGoal: row.long_term_goal,
    motivation: row.motivation,
    coachSupport: row.coach_support,
    yearsPlaying: row.years_playing,
    hasCompeted: row.has_competed,
    selfPerceivedLevel: row.self_perceived_level,
    paddleGrip: row.paddle_grip,
    rubberForehand: row.rubber_forehand,
    rubberBackhand: row.rubber_backhand,
    playingStyle: row.playing_style,
    club: row.club,
    specificGoal: row.specific_goal,
    trainingDays: row.training_days,
  };
}

function toDbWelcomeForm(answers: WelcomeFormAnswers): DbWelcomeForm {
  return {
    main_goal: answers.mainGoal,
    short_term_goal: answers.shortTermGoal,
    long_term_goal: answers.longTermGoal,
    motivation: answers.motivation,
    coach_support: answers.coachSupport,
    years_playing: answers.yearsPlaying,
    has_competed: answers.hasCompeted,
    self_perceived_level: answers.selfPerceivedLevel,
    paddle_grip: answers.paddleGrip,
    rubber_forehand: answers.rubberForehand,
    rubber_backhand: answers.rubberBackhand,
    playing_style: answers.playingStyle,
    club: answers.club,
    specific_goal: answers.specificGoal,
    training_days: answers.trainingDays,
  };
}

function profileOf(input: NewAthleteInput): Pick<DbAthlete, 'level' | 'paddle_grip' | 'rubber_forehand' | 'rubber_backhand' | 'playing_style' | 'club' | 'specific_goal' | 'training_days'> {
  const isIntermediateOrAbove = input.level === 'intermedio' || input.level === 'avanzado';
  const isAdvanced = input.level === 'avanzado';
  return {
    level: input.level,
    paddle_grip: isIntermediateOrAbove ? input.paddleGrip : null,
    rubber_forehand: isIntermediateOrAbove ? input.rubberForehand : null,
    rubber_backhand: isIntermediateOrAbove ? input.rubberBackhand : null,
    playing_style: isIntermediateOrAbove ? input.playingStyle : null,
    club: isAdvanced ? input.club : null,
    specific_goal: isAdvanced ? input.specificGoal : null,
    training_days: [...input.trainingDays].sort((a, b) => a - b),
  };
}

@Injectable({ providedIn: 'root' })
export class PlayersService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly _athletes = signal<Athlete[]>([]);
  readonly athletes = this._athletes.asReadonly();

  /** Carga todos los atletas visibles para el usuario autenticado. */
  async loadAthletes(): Promise<void> {
    const { data, error } = await this.supabase
      .from('athletes')
      .select('*, welcome_form_answers(*)')
      .order('last_name', { ascending: true })
      .returns<DbAthlete[]>();

    if (error) {
      console.error('Error cargando atletas:', error);
      return;
    }

    this._athletes.set((data ?? []).map((row) => fromDbRow(row as DbAthlete)));
  }

  /** Crea un nuevo jugador generando automáticamente su usuario y clave temporal. */
  async addAthlete(input: NewAthleteInput): Promise<Athlete | null> {
    const usedUsernames = new Set(this._athletes().map((a) => a.username));
    const username = this.reserveUsername(input.firstName, input.lastName, usedUsernames);
    const tempPassword = `TM-${new Date().getFullYear()}-${randomAlnum(4)}`;

    const { data: inserted, error } = await this.supabase
      .from('athletes')
      .insert({
        first_name: input.firstName,
        last_name: input.lastName,
        birth_date: dateKey(input.birthDate),
        phone: input.phone,
        category: input.category,
        player_type: input.playerType,
        dominant_hand: input.dominantHand,
        username,
        temp_password: tempPassword,
        status: 'activo',
        attendance_rate: 0,
        welcome_form_completed: false,
        ...profileOf(input),
      })
      .select('id')
      .single<{ id: number }>();

    if (error || !inserted) {
      console.error('Error creando atleta:', error);
      return null;
    }

    const athlete = athleteFromInput(inserted.id, input, username, tempPassword);
    this._athletes.update((list) => [...list, athlete].sort((a, b) => a.lastName.localeCompare(b.lastName)));

    // Crea la cuenta de autenticación del jugador a través de una Edge Function
    // que usa la service_role key (no se expone en el frontend).
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa para invocar create-player-user');
      }

      const response = await fetch(
        `${environment.supabase.url}/functions/v1/create-player-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            athlete_id: athlete.id,
            username: athlete.username,
            temp_password: athlete.tempPassword,
            first_name: athlete.firstName,
            last_name: athlete.lastName,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorBody.error ?? `Error ${response.status} al crear usuario`);
      }

      const result = (await response.json()) as { user_id: string };
      console.log('Usuario de auth creado/vinculado:', result.user_id);
    } catch (err) {
      console.error('Error invocando create-player-user:', err);
    }

    return athlete;
  }

  /** Actualiza los datos editables de un jugador existente (no toca usuario/clave/estado/asistencia). */
  async updateAthlete(athleteId: number, input: NewAthleteInput): Promise<Athlete | null> {
    const { error } = await this.supabase
      .from('athletes')
      .update({
        first_name: input.firstName,
        last_name: input.lastName,
        birth_date: dateKey(input.birthDate),
        phone: input.phone,
        category: input.category,
        player_type: input.playerType,
        dominant_hand: input.dominantHand,
        ...profileOf(input),
      })
      .eq('id', athleteId);

    if (error) {
      console.error('Error actualizando atleta:', error);
      return null;
    }

    await this.loadAthletes();
    return this._athletes().find((a) => a.id === athleteId) ?? null;
  }

  /**
   * Guarda las respuestas del formulario de bienvenida. El trigger de base de datos
   * actualiza `athletes.welcome_form_completed` y el perfil técnico declarado.
   */
  async submitWelcomeForm(athleteId: number, answers: WelcomeFormAnswers): Promise<void> {
    const { error } = await this.supabase.from('welcome_form_answers').upsert(
      {
        athlete_id: athleteId,
        ...toDbWelcomeForm(answers),
      },
      { onConflict: 'athlete_id' },
    );

    if (error) {
      console.error('Error guardando formulario de bienvenida:', error);
      return;
    }

    await this.loadAthletes();
  }

  /** True si el jugador existe y todavía no completó el formulario de bienvenida. */
  isWelcomeFormPending(athleteId: number): boolean {
    const athlete = this._athletes().find((a) => a.id === athleteId);
    return athlete !== undefined && !athlete.welcomeFormCompleted;
  }

  /** Alterna el estado activo/inactivo de un jugador (no se elimina de la base de datos). */
  async toggleStatus(athleteId: number): Promise<void> {
    const athlete = this._athletes().find((a) => a.id === athleteId);
    if (!athlete) return;

    const nextStatus = athlete.status === 'activo' ? 'inactivo' : 'activo';
    const { error } = await this.supabase.from('athletes').update({ status: nextStatus }).eq('id', athleteId);

    if (error) {
      console.error('Error cambiando estado del atleta:', error);
      return;
    }

    this._athletes.update((list) =>
      list.map((a) => (a.id === athleteId ? { ...a, status: nextStatus } : a)),
    );
  }

  /** Alterna el estado de pago del jugador. Requiere la columna `paid` en la tabla athletes. */
  async togglePaid(athleteId: number): Promise<void> {
    const athlete = this._athletes().find((a) => a.id === athleteId);
    if (!athlete) return;

    const nextPaid = !athlete.paid;
    const { error } = await this.supabase.from('athletes').update({ paid: nextPaid }).eq('id', athleteId);

    if (error) {
      console.error('Error cambiando estado de pago del atleta:', error);
      return;
    }

    this._athletes.update((list) =>
      list.map((a) => (a.id === athleteId ? { ...a, paid: nextPaid } : a)),
    );
  }

  /** Actualiza la deuda de un jugador. Requiere la columna `debt` en la tabla athletes. */
  async updateDebt(athleteId: number, debt: number): Promise<void> {
    const { error } = await this.supabase.from('athletes').update({ debt }).eq('id', athleteId);

    if (error) {
      console.error('Error actualizando deuda del atleta:', error);
      return;
    }

    this._athletes.update((list) =>
      list.map((a) => (a.id === athleteId ? { ...a, debt } : a)),
    );
  }

  /** True si el jugador existe y todavía no completó el primer login. */
  isSetupPending(athleteId: number): boolean {
    const athlete = this._athletes().find((a) => a.id === athleteId);
    return athlete !== undefined && !athlete.setupCompleted;
  }

  /** Marca el primer login como completado y guarda el email del jugador. */
  async completeSetup(athleteId: number, email: string): Promise<void> {
    const { error } = await this.supabase
      .from('athletes')
      .update({ email, setup_completed: true })
      .eq('id', athleteId);

    if (error) {
      console.error('Error completando primer login:', error);
      return;
    }

    this._athletes.update((list) =>
      list.map((a) => (a.id === athleteId ? { ...a, email, setupCompleted: true } : a)),
    );
  }

  async findByUsername(username: string): Promise<Athlete | undefined> {
    const local = this._athletes().find((a) => a.username === username);
    if (local) return local;

    const { data, error } = await this.supabase
      .from('athletes')
      .select('*, welcome_form_answers(*)')
      .eq('username', username)
      .maybeSingle<DbAthlete>();

    if (error || !data) {
      return undefined;
    }

    return fromDbRow(data as DbAthlete);
  }

  private reserveUsername(firstName: string, lastName: string, used: Set<string>): string {
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
}
