import { Injectable, signal } from '@angular/core';
import { dateKey } from '../../core/date/calendar-dates';
import {
  AnnualGoal,
  AttendanceDay,
  AttendanceDayStatus,
  ClubInfo,
  Competition,
  EliteAthleteProfile,
  EquipmentInfo,
  TrainingDayPlan,
} from './atleta.models';

const CURRENT_YEAR = new Date().getFullYear();

/** Primer mes de la temporada con asistencia registrada (marzo). */
const SEASON_START_MONTH = 2;
/** Último mes de la temporada (diciembre). */
const SEASON_END_MONTH = 11;

/**
 * Generador pseudoaleatorio determinístico (mulberry32): con la misma semilla
 * siempre produce la misma secuencia, así el mock no cambia en cada recarga.
 */
function seededRandom(seed: number): () => number {
  let state = seed + 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Plan semanal del atleta élite: doble turno en CENARD, saques diarios,
 * físico y una particular con el entrenador local los viernes.
 */
function buildWeeklyPlan(): TrainingDayPlan[] {
  return [
    {
      weekday: 1,
      activities: [
        { label: 'CENARD', location: 'cenard', durationMin: 120, sessions: 2 },
        { label: 'Saques', location: 'club', durationMin: 45, sessions: 1 },
      ],
    },
    {
      weekday: 2,
      activities: [
        { label: 'CENARD', location: 'cenard', durationMin: 120, sessions: 2 },
        { label: 'Físico', location: 'gimnasio', durationMin: 60, sessions: 1 },
      ],
    },
    {
      weekday: 3,
      activities: [
        { label: 'Saques', location: 'club', durationMin: 45, sessions: 1 },
        { label: 'CENARD', location: 'cenard', durationMin: 120, sessions: 1 },
        { label: 'Físico', location: 'gimnasio', durationMin: 60, sessions: 1 },
      ],
    },
    {
      weekday: 4,
      activities: [
        { label: 'CENARD', location: 'cenard', durationMin: 120, sessions: 2 },
        { label: 'Físico', location: 'gimnasio', durationMin: 60, sessions: 1 },
      ],
    },
    {
      weekday: 5,
      activities: [
        { label: 'Particular con entrenador local', location: 'particular', durationMin: 150, sessions: 1 },
        { label: 'Saques', location: 'club', durationMin: 45, sessions: 1 },
      ],
    },
    {
      weekday: 6,
      activities: [{ label: 'Sparring / partidos de práctica', location: 'club', durationMin: 120, sessions: 1 }],
    },
    { weekday: 7, activities: [] },
  ];
}

const EQUIPMENT_OPTIONS: EquipmentInfo[] = [
  {
    blade: 'Butterfly Viscaria (FL)',
    rubberForehand: 'Butterfly Tenergy 05 · 2.1 mm · rojo',
    rubberBackhand: 'Butterfly Dignics 64 · 1.9 mm · negro',
    ballBrand: 'Nittaku Premium 40+ ***',
  },
  {
    blade: 'Stiga Infinity VPS V (FL)',
    rubberForehand: 'DHS Hurricane 3 Neo · 2.15 mm · rojo',
    rubberBackhand: 'Xiom Vega Pro · 2.0 mm · negro',
    ballBrand: 'Xushaofa 40+ ***',
  },
  {
    blade: 'Donic Ovtcharov True Carbon (FL)',
    rubberForehand: 'Donic Bluefire M1 · 2.0 mm · negro',
    rubberBackhand: 'Tibhar Evolution FX-P · 1.9 mm · rojo',
    ballBrand: 'Donic P40+ ***',
  },
];

const CLUB_OPTIONS: ClubInfo[] = [
  {
    name: 'Club Atlético San Isidro',
    venue: 'Gimnasio Central — 6 mesas',
    city: 'San Isidro, Buenos Aires',
    localCoach: 'Prof. Gustavo Ledesma',
    coachPhone: '+54 9 11 4477-2210',
    memberSince: 2016,
  },
  {
    name: 'Club Ferro Carril Oeste',
    venue: 'Sede Caballito — Sala de tenis de mesa',
    city: 'CABA',
    localCoach: 'Prof. Laura Benítez',
    coachPhone: '+54 9 11 4466-1188',
    memberSince: 2018,
  },
  {
    name: 'Club Náutico Hacoaj',
    venue: 'Polideportivo — 4 mesas',
    city: 'Tigre, Buenos Aires',
    localCoach: 'Prof. Ariel Domínguez',
    coachPhone: '+54 9 11 4499-3320',
    memberSince: 2017,
  },
];

/** Torneos de la temporada: se reparten entre abril y noviembre del año en curso. */
function buildCompetitions(athleteId: number): Competition[] {
  const random = seededRandom(athleteId * 31);
  const pickPlacement = (options: string[]) => options[Math.floor(random() * options.length)];

  return [
    {
      id: 1,
      name: 'Torneo Nacional Federativo — 1.ª Fecha',
      level: 'nacional',
      date: new Date(CURRENT_YEAR, 3, 12),
      city: 'Rosario, Santa Fe',
      draw: 'Sub-19 Masculino',
      placement: pickPlacement(['Campeón', 'Finalista', 'Semifinal']),
      matches: [
        { round: 'Grupo', opponent: 'L. Peralta (Córdoba)', result: 'victoria', score: '3-0 (11-6, 11-8, 11-5)' },
        { round: 'Grupo', opponent: 'M. Quiroga (Santa Fe)', result: 'victoria', score: '3-1 (11-9, 8-11, 11-7, 11-6)' },
        { round: 'Cuartos', opponent: 'F. Ibarra (CABA)', result: 'victoria', score: '3-2 (9-11, 11-7, 11-9, 6-11, 11-8)' },
        { round: 'Semifinal', opponent: 'J. Ramírez (Mendoza)', result: 'derrota', score: '2-3 (11-7, 9-11, 11-8, 7-11, 9-11)' },
      ],
      notes: 'Muy sólido de derecha; perdió el control del ritmo en los sets largos.',
    },
    {
      id: 2,
      name: 'Copa CENARD Juvenil',
      level: 'regional',
      date: new Date(CURRENT_YEAR, 5, 7),
      city: 'CABA',
      draw: 'Primera',
      placement: pickPlacement(['3.º puesto', 'Cuartos de final', 'Semifinal']),
      matches: [
        { round: 'Octavos', opponent: 'D. Sosa (Buenos Aires)', result: 'victoria', score: '3-0 (11-4, 11-9, 11-7)' },
        { round: 'Cuartos', opponent: 'N. Ferreyra (Entre Ríos)', result: 'victoria', score: '3-1 (11-6, 11-13, 11-8, 11-9)' },
        { round: 'Semifinal', opponent: 'A. Molina (CABA)', result: 'derrota', score: '1-3 (11-9, 7-11, 8-11, 6-11)' },
      ],
      notes: 'Buena lectura del saque rival; recepción de revés a mejorar.',
    },
    {
      id: 3,
      name: 'Sudamericano Juvenil',
      level: 'internacional',
      date: new Date(CURRENT_YEAR, 7, 23),
      city: 'Asunción, Paraguay',
      draw: 'Sub-19 Masculino',
      placement: pickPlacement(['Cuartos de final', 'Octavos de final', 'Semifinal']),
      matches: [
        { round: 'Grupo', opponent: 'R. Coelho (BRA)', result: 'derrota', score: '1-3 (11-8, 6-11, 9-11, 7-11)' },
        { round: 'Grupo', opponent: 'S. Aguirre (CHI)', result: 'victoria', score: '3-0 (11-7, 11-5, 11-9)' },
        { round: 'Octavos', opponent: 'P. Cardozo (PAR)', result: 'victoria', score: '3-2 (8-11, 11-9, 11-7, 5-11, 11-9)' },
        { round: 'Cuartos', opponent: 'T. Almeida (BRA)', result: 'derrota', score: '0-3 (7-11, 9-11, 8-11)' },
      ],
      notes: 'Primera experiencia internacional del año: gran actitud competitiva.',
    },
    {
      id: 4,
      name: 'Torneo Nacional Federativo — 3.ª Fecha',
      level: 'nacional',
      date: new Date(CURRENT_YEAR, 8, 20),
      city: 'Mar del Plata, Buenos Aires',
      draw: 'Primera',
      placement: pickPlacement(['Campeón', 'Finalista', '3.º puesto']),
      matches: [
        { round: 'Grupo', opponent: 'E. Vallejos (La Pampa)', result: 'victoria', score: '3-0 (11-5, 11-7, 11-6)' },
        { round: 'Cuartos', opponent: 'G. Maidana (Chaco)', result: 'victoria', score: '3-1 (11-8, 11-6, 9-11, 11-7)' },
        { round: 'Semifinal', opponent: 'J. Ramírez (Mendoza)', result: 'victoria', score: '3-2 (11-9, 8-11, 11-6, 10-12, 11-8)' },
        { round: 'Final', opponent: 'A. Molina (CABA)', result: 'victoria', score: '3-1 (11-7, 9-11, 11-8, 11-9)' },
      ],
      notes: 'Mejor torneo de la temporada: revirtió el historial ante Molina.',
    },
    {
      id: 5,
      name: 'Campeonato Argentino',
      level: 'nacional',
      date: new Date(CURRENT_YEAR, 10, 15),
      city: 'Córdoba',
      draw: 'Primera',
      placement: pickPlacement(['Semifinal', 'Cuartos de final', 'Finalista']),
      matches: [
        { round: 'Octavos', opponent: 'C. Villalba (Salta)', result: 'victoria', score: '3-0 (11-6, 11-8, 11-4)' },
        { round: 'Cuartos', opponent: 'F. Ibarra (CABA)', result: 'victoria', score: '3-1 (11-9, 11-7, 8-11, 11-6)' },
        { round: 'Semifinal', opponent: 'T. Almeida (invitado)', result: 'derrota', score: '2-3 (11-8, 11-9, 7-11, 9-11, 8-11)' },
      ],
      notes: 'Cierre de temporada con buen nivel físico; ajustar el servicio corto.',
    },
  ];
}

const ANNUAL_GOALS_SEED: Omit<AnnualGoal, 'month'>[] = [
  {
    shortTerm: 'Retomar la carga de entrenamiento tras el receso.',
    mediumTerm: 'Recuperar el volumen de juego previo a las vacaciones.',
    longTerm: 'Clasificar al Campeonato Argentino de Primera.',
  },
  {
    shortTerm: 'Pretemporada física: fuerza de base y movilidad.',
    mediumTerm: 'Sostener el doble turno en CENARD sin molestias.',
    longTerm: 'Clasificar al Campeonato Argentino de Primera.',
  },
  {
    shortTerm: 'Estandarizar la rutina de 45 min de saques diarios.',
    mediumTerm: 'Ampliar a 3 variantes de saque con efecto lateral.',
    longTerm: 'Clasificar al Campeonato Argentino de Primera.',
  },
  {
    shortTerm: 'Competir la 1.ª fecha del Nacional Federativo.',
    mediumTerm: 'Entrar entre los 8 primeros del ranking nacional.',
    longTerm: 'Clasificar al Campeonato Argentino de Primera.',
  },
  {
    shortTerm: 'Corregir la posición de espera en recepción.',
    mediumTerm: 'Bajar el porcentaje de errores de recepción al 15%.',
    longTerm: 'Ser convocado al seleccionado juvenil.',
  },
  {
    shortTerm: 'Copa CENARD: llegar a semifinales.',
    mediumTerm: 'Sostener el nivel ante jugadores de Primera.',
    longTerm: 'Ser convocado al seleccionado juvenil.',
  },
  {
    shortTerm: 'Bloque de carga: sumar sparring de zurdos.',
    mediumTerm: 'Preparar el Sudamericano Juvenil.',
    longTerm: 'Ser convocado al seleccionado juvenil.',
  },
  {
    shortTerm: 'Sudamericano Juvenil: superar la fase de grupos.',
    mediumTerm: 'Acumular experiencia internacional.',
    longTerm: 'Ser convocado al seleccionado juvenil.',
  },
  {
    shortTerm: '3.ª fecha del Nacional: pelear el título.',
    mediumTerm: 'Consolidarse en el top 4 del ranking nacional.',
    longTerm: 'Ser convocado al seleccionado juvenil.',
  },
  {
    shortTerm: 'Mejorar el topspin de revés desde media distancia.',
    mediumTerm: 'Integrar el revés al esquema de ataque.',
    longTerm: 'Sumar puntos para el ranking mundial juvenil.',
  },
  {
    shortTerm: 'Campeonato Argentino: llegar en pico de forma.',
    mediumTerm: 'Cerrar la temporada en el podio nacional.',
    longTerm: 'Sumar puntos para el ranking mundial juvenil.',
  },
  {
    shortTerm: 'Descarga y evaluación de la temporada.',
    mediumTerm: 'Planificar la pretemporada del próximo año.',
    longTerm: 'Sumar puntos para el ranking mundial juvenil.',
  },
];

function buildAnnualGoals(): AnnualGoal[] {
  return ANNUAL_GOALS_SEED.map((goal, month) => ({ month, ...goal }));
}

/**
 * Genera la asistencia de la temporada (marzo a diciembre) para los días que
 * tienen actividad en el plan semanal. Los días de torneo quedan marcados como
 * 'competencia' y el resto se reparte mayormente en 'presente'.
 */
function buildAttendance(
  athleteId: number,
  weeklyPlan: TrainingDayPlan[],
  competitions: Competition[],
): AttendanceDay[] {
  const random = seededRandom(athleteId * 7919);
  const plannedWeekdays = new Set(
    weeklyPlan.filter((day) => day.activities.length > 0).map((day) => day.weekday),
  );
  const competitionKeys = new Set(competitions.map((competition) => dateKey(competition.date)));

  const days: AttendanceDay[] = [];
  for (let month = SEASON_START_MONTH; month <= SEASON_END_MONTH; month++) {
    const daysInMonth = new Date(CURRENT_YEAR, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(CURRENT_YEAR, month, day);
      const weekday = ((date.getDay() + 6) % 7) + 1; // 1 = lunes
      const key = dateKey(date);

      if (competitionKeys.has(key)) {
        days.push({ dateKey: key, status: 'competencia', note: 'Torneo' });
        continue;
      }

      if (!plannedWeekdays.has(weekday as TrainingDayPlan['weekday'])) continue;

      days.push({ dateKey: key, status: rollStatus(random()) });
    }
  }

  return days;
}

/** Reparte los estados del mock: ~85% presente, 8% justificado, 7% ausente. */
function rollStatus(roll: number): AttendanceDayStatus {
  if (roll < 0.85) return 'presente';
  if (roll < 0.93) return 'justificado';
  return 'ausente';
}

function buildProfile(athleteId: number): EliteAthleteProfile {
  const weeklyPlan = buildWeeklyPlan();
  const competitions = buildCompetitions(athleteId);
  const optionIndex = athleteId % EQUIPMENT_OPTIONS.length;

  return {
    athleteId,
    year: CURRENT_YEAR,
    equipment: EQUIPMENT_OPTIONS[optionIndex],
    club: CLUB_OPTIONS[athleteId % CLUB_OPTIONS.length],
    weeklyPlan,
    attendance: buildAttendance(athleteId, weeklyPlan, competitions),
    competitions,
    annualGoals: buildAnnualGoals(),
  };
}

const STORAGE_KEY = 'tt-trainer-atleta-profiles';

@Injectable({ providedIn: 'root' })
export class AtletaService {
  /** Fichas ya materializadas, indexadas por id de atleta. Las mutaciones repintan los tabs que las leen. */
  private readonly profiles = signal<Record<number, EliteAthleteProfile>>(this.readStored());

  /**
   * Ficha de seguimiento del atleta. Si todavía no fue modificada, devuelve la
   * versión generada de forma determinística (misma data en cada recarga), por lo
   * que puede leerse dentro de un `computed` sin efectos secundarios.
   */
  profileFor(athleteId: number): EliteAthleteProfile {
    return this.profiles()[athleteId] ?? buildProfile(athleteId);
  }

  /** Fija el estado de asistencia de un día concreto (clave 'yyyy-mm-dd'). */
  setAttendanceStatus(athleteId: number, dayKey: string, status: AttendanceDayStatus): void {
    this.updateProfile(athleteId, (profile) => {
      const exists = profile.attendance.some((day) => day.dateKey === dayKey);
      const attendance = exists
        ? profile.attendance.map((day) => (day.dateKey === dayKey ? { ...day, status } : day))
        : [...profile.attendance, { dateKey: dayKey, status }];
      return { ...profile, attendance };
    });
  }

  /** Rota el estado del día (presente → ausente → justificado → competencia → presente). */
  cycleAttendanceStatus(athleteId: number, dayKey: string): void {
    const order: AttendanceDayStatus[] = ['presente', 'ausente', 'justificado', 'competencia'];
    const current = this.profileFor(athleteId).attendance.find((day) => day.dateKey === dayKey);
    const nextIndex = current ? (order.indexOf(current.status) + 1) % order.length : 0;
    this.setAttendanceStatus(athleteId, dayKey, order[nextIndex]);
  }

  /** Guarda los objetivos (corto/mediano/largo plazo) de un mes del calendario anual. */
  updateAnnualGoal(athleteId: number, month: number, patch: Omit<AnnualGoal, 'month'>): void {
    this.updateProfile(athleteId, (profile) => ({
      ...profile,
      annualGoals: profile.annualGoals.map((goal) => (goal.month === month ? { ...goal, ...patch } : goal)),
    }));
  }

  private updateProfile(
    athleteId: number,
    mutate: (profile: EliteAthleteProfile) => EliteAthleteProfile,
  ): void {
    this.profiles.update((profiles) => ({
      ...profiles,
      [athleteId]: mutate(profiles[athleteId] ?? buildProfile(athleteId)),
    }));
    this.persist();
  }

  /** Persiste las fichas modificadas en localStorage para que sobrevivan a recargas. */
  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profiles()));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.): se ignora silenciosamente.
    }
  }

  /** Lee las fichas guardadas (reviviendo las fechas de las competencias); si no hay nada, arranca vacío. */
  private readStored(): Record<number, EliteAthleteProfile> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<string, EliteAthleteProfile>;
      const revived: Record<number, EliteAthleteProfile> = {};
      for (const [athleteId, profile] of Object.entries(parsed)) {
        revived[Number(athleteId)] = {
          ...profile,
          competitions: profile.competitions.map((competition) => ({
            ...competition,
            date: new Date(competition.date),
          })),
        };
      }
      return revived;
    } catch {
      return {};
    }
  }
}
