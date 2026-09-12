import { Injectable, signal } from '@angular/core';

/** Nivel de juego: 8 = novato/principiante, 1 = élite/avanzado. */
export type Category = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
  selfPerceivedLevel: 'principiante' | 'intermedio' | 'avanzado';
}

export interface Athlete {
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
  paddleGrip: 'clasica' | 'lapicero';
  /** Indica si el jugador ya completó el formulario de bienvenida (objetivos/motivación/experiencia). */
  welcomeFormCompleted: boolean;
  welcomeForm: WelcomeFormAnswers | null;
}

export type NewAthleteInput = Pick<
  Athlete,
  'firstName' | 'lastName' | 'category' | 'birthDate' | 'dominantHand' | 'paddleGrip' | 'phone' | 'playerType'
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
      paddleGrip: input.paddleGrip,
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
              paddleGrip: input.paddleGrip,
            }
          : athlete,
      ),
    );
    this.persist();
  }

  /** Guarda las respuestas del formulario de bienvenida y lo marca como completado. */
  submitWelcomeForm(athleteId: number, answers: WelcomeFormAnswers): void {
    this._athletes.update((list) =>
      list.map((athlete) =>
        athlete.id === athleteId
          ? { ...athlete, welcomeForm: answers, welcomeFormCompleted: true }
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

  /** Persiste la lista completa de jugadores en localStorage para que sobreviva a recargas. */
  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._athletes()));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.): se ignora silenciosamente.
    }
  }

  /** Lee la lista de jugadores guardada; si no hay nada o está corrupta, arranca vacía. */
  private readStored(): Athlete[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Athlete[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((athlete) => ({ ...athlete, birthDate: new Date(athlete.birthDate) }));
    } catch {
      return [];
    }
  }
}
