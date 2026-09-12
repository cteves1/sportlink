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

type SeedAthlete = Omit<Athlete, 'welcomeFormCompleted' | 'welcomeForm'>;

function buildMockAthletes(): Athlete[] {
  const named: SeedAthlete[] = [
    { id: 1, firstName: 'Matías', lastName: 'Fernández', category: 1, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0001', username: '', tempPassword: '', attendance: 96, birthDate: new Date(2005, 2, 14), dominantHand: 'derecha', paddleGrip: 'clasica' },
    { id: 2, firstName: 'Sofía', lastName: 'Rojas', category: 2, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0002', username: '', tempPassword: '', attendance: 90, birthDate: new Date(2007, 6, 3), dominantHand: 'derecha', paddleGrip: 'lapicero' },
    { id: 3, firstName: 'Diego', lastName: 'Vargas', category: 3, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0003', username: '', tempPassword: '', attendance: 78, birthDate: new Date(2009, 9, 21), dominantHand: 'izquierda', paddleGrip: 'clasica' },
    { id: 4, firstName: 'Camila', lastName: 'Torres', category: 3, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0004', username: '', tempPassword: '', attendance: 85, birthDate: new Date(2008, 1, 9), dominantHand: 'derecha', paddleGrip: 'clasica' },
    { id: 5, firstName: 'Ignacio', lastName: 'Soto', category: 4, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0005', username: '', tempPassword: '', attendance: 88, birthDate: new Date(2010, 4, 30), dominantHand: 'derecha', paddleGrip: 'lapicero' },
    { id: 6, firstName: 'Valentina', lastName: 'Muñoz', category: 4, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0006', username: '', tempPassword: '', attendance: 92, birthDate: new Date(2011, 7, 17), dominantHand: 'izquierda', paddleGrip: 'clasica' },
    { id: 7, firstName: 'Benjamín', lastName: 'Castro', category: 5, status: 'inactivo', playerType: 'invitado', phone: '+54 9 11 5551-0007', username: '', tempPassword: '', attendance: 60, birthDate: new Date(2006, 11, 5), dominantHand: 'derecha', paddleGrip: 'clasica' },
    { id: 8, firstName: 'Antonia', lastName: 'Reyes', category: 6, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0008', username: '', tempPassword: '', attendance: 74, birthDate: new Date(2012, 3, 22), dominantHand: 'derecha', paddleGrip: 'clasica' },
    { id: 9, firstName: 'Tomás', lastName: 'Silva', category: 7, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0009', username: '', tempPassword: '', attendance: 82, birthDate: new Date(2013, 8, 11), dominantHand: 'izquierda', paddleGrip: 'lapicero' },
    { id: 10, firstName: 'Isidora', lastName: 'Pérez', category: 8, status: 'activo', playerType: 'regular', phone: '+54 9 11 5551-0010', username: '', tempPassword: '', attendance: 95, birthDate: new Date(2014, 5, 27), dominantHand: 'derecha', paddleGrip: 'clasica' },
  ];

  // Jugadores 11-46: placeholders numerados, con status/tipo/categoría variados
  // cíclicamente para cubrir todos los filtros desde el primer momento.
  const placeholders: SeedAthlete[] = [];
  for (let n = 11; n <= 46; n++) {
    const category = (((n - 1) % 8) + 1) as Category;
    const status: Athlete['status'] = n % 4 === 0 ? 'inactivo' : 'activo';
    const playerType: Athlete['playerType'] = n % 5 === 0 ? 'invitado' : 'regular';
    placeholders.push({
      id: n,
      firstName: `Jugador`,
      lastName: `${n}`,
      category,
      status,
      playerType,
      phone: `+54 9 11 5551-${String(n).padStart(4, '0')}`,
      username: '',
      tempPassword: '',
      attendance: 50 + ((n * 7) % 50),
      birthDate: new Date(2000 + (n % 15), n % 12, (n % 27) + 1),
      dominantHand: n % 2 === 0 ? 'derecha' : 'izquierda',
      paddleGrip: n % 3 === 0 ? 'lapicero' : 'clasica',
    });
  }

  // Los jugadores semilla ya forman parte del club: se consideran onboardeados
  // (no se guardan respuestas históricas del formulario de bienvenida).
  const all = [...named, ...placeholders].map((athlete) => ({
    ...athlete,
    welcomeFormCompleted: true,
    welcomeForm: null,
  }));

  // Asigna username/tempPassword de forma determinística para el seed inicial.
  const usedUsernames = new Set<string>();
  for (const athlete of all) {
    athlete.username = reserveUsername(athlete.firstName, athlete.lastName, usedUsernames);
    athlete.tempPassword = `TM-2026-${athlete.id.toString(36).toUpperCase().padStart(2, '0')}${randomAlnum(2)}`;
  }

  return all;
}

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
  private readonly _athletes = signal<Athlete[]>(buildMockAthletes());
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
    return newAthlete;
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
  }

  findByUsername(username: string): Athlete | undefined {
    return this._athletes().find((athlete) => athlete.username === username);
  }
}
