import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideCircleCheck,
  LucideClipboardCheck,
  LucideClock,
  LucideFlame,
  LucideHand,
  LucideMapPin,
  LucideMoon,
  LucidePercent,
  LucideShieldCheck,
  LucideStickyNote,
  LucideSun,
  LucideSunrise,
  LucideSunset,
  LucideTableProperties,
  LucideTarget,
  LucideTrendingUp,
  LucideTrophy,
  LucideUserPlus,
  LucideUsers,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  Athlete as PlayerAthlete,
  PlayersService,
  categoryLabel,
  paddleGripLabel,
} from '../../core/players/players.service';
import { PlayerFormModal } from '../../shared/player-form-modal/player-form-modal';
import { ProgressChart, ProgressSeries } from '../../shared/progress-chart/progress-chart';
import { PROGRESS_BY_RANGE, PROGRESS_RANGE_LABELS, ProgressRange } from './progress.mock';
import { AtletaService } from '../atleta/atleta.service';
import {
  TRAINING_LOAD_LABELS,
  WORK_TYPE_LABELS,
  dailyMesocyclePlan,
} from '../atleta/periodization';
import { CalendarService } from '../calendario/calendar.service';
import { TrainingSession } from '../calendario/calendar.models';
import { Competition, CompetitionLevel } from '../atleta/atleta.models';
import { addDays, atMidnight, capitalize, dateKey } from '../../core/date/calendar-dates';

interface WeeklyAttendance {
  percentage: number;
}

interface TableStatus {
  total: number;
  inUse: number;
}

interface CoachTask {
  id: number;
  text: string;
  done: boolean;
}

interface PlayerStats {
  monthlyAttendance: number;
  tableHours: number;
  streak: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    PlayerFormModal,
    ProgressChart,
    LucideUsers,
    LucidePercent,
    LucideTableProperties,
    LucideClipboardCheck,
    LucideUserPlus,
    LucideCircleCheck,
    LucideTrophy,
    LucideStickyNote,
    LucideTarget,
    LucideSunrise,
    LucideSun,
    LucideSunset,
    LucideMoon,
    LucideClock,
    LucideFlame,
    LucideHand,
    LucideMapPin,
    LucideShieldCheck,
    LucideTrendingUp,
  ],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly playersService = inject(PlayersService);
  private readonly atletaService = inject(AtletaService);
  private readonly calendarService = inject(CalendarService);
  private readonly router = inject(Router);

  protected readonly trainingLoadLabels = TRAINING_LOAD_LABELS;
  protected readonly workTypeLabels = WORK_TYPE_LABELS;

  private readonly coachName = 'Entrenador';

  /** Rol del usuario logueado: determina qué dashboard se renderiza. */
  protected readonly role = computed(() => this.authService.user()?.role ?? 'admin');

  /** Ficha técnica del atleta logueado (solo aplica cuando role() === 'player'). */
  protected readonly currentAthlete = computed<PlayerAthlete | undefined>(() => {
    const athleteId = this.authService.user()?.athleteId;
    if (athleteId === undefined) return undefined;
    return this.playersService.athletes().find((athlete) => athlete.id === athleteId);
  });

  protected readonly today = new Date();

  ngOnInit(): void {
    const today = atMidnight(new Date());
    const future = addDays(today, 30);
    void this.calendarService.ensureSessionsForRange(today, future);
  }

  protected readonly formattedDate = computed(() =>
    new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.today),
  );

  protected readonly greeting = computed(() => {
    const hour = this.today.getHours();
    if (hour < 6) return `Buenas noches, ${this.coachName}`;
    if (hour < 12) return `Buenos días, ${this.coachName}`;
    if (hour < 20) return `Buenas tardes, ${this.coachName}`;
    return `Buenas noches, ${this.coachName}`;
  });

  /** Periodo del día usado para elegir el icono de saludo en la plantilla. */
  protected readonly greetingPeriod = computed<'noche' | 'mañana' | 'dia' | 'tarde'>(() => {
    const hour = this.today.getHours();
    if (hour < 6) return 'noche';
    if (hour < 12) return 'mañana';
    if (hour < 20) return 'dia';
    return 'tarde';
  });

  protected readonly activeAthletesCount = computed(
    () => this.playersService.athletes().filter((athlete) => athlete.status === 'activo').length,
  );

  protected readonly weeklyAttendance = signal<WeeklyAttendance>({ percentage: 92 });

  protected readonly tableStatus = signal<TableStatus>({ total: 6, inUse: 4 });

  protected readonly todaysSessions = computed(() =>
    this.calendarService.sessionsForDate(atMidnight(new Date())),
  );

  protected readonly nextSession = computed<TrainingSession | null>(() => {
    const today = atMidnight(new Date()).getTime();
    return this.calendarService
      .sessions()
      .filter((session) => session.date.getTime() >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  });

  protected readonly tasks = signal<CoachTask[]>([
    { id: 1, text: 'Revisar gomas de la paleta de Matías', done: false },
    { id: 2, text: 'Diseñar rutina de saques para nivel intermedio', done: false },
    { id: 3, text: 'Enviar planificación semanal a los padres', done: true },
    { id: 4, text: 'Coordinar sparring con club vecino', done: false },
  ]);

  protected toggleTask(taskId: number): void {
    this.tasks.update((tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    );
  }

  // ------------------------------------------------------------------
  // Acciones rápidas
  // ------------------------------------------------------------------

  protected readonly playerFormOpen = signal(false);

  /** Lleva al calendario abriendo directamente el registro de asistencia de hoy. */
  protected goToAttendance(): void {
    void this.router.navigate(['/calendario'], { queryParams: { asistencia: 'hoy' } });
  }

  protected openPlayerForm(): void {
    this.playerFormOpen.set(true);
  }

  protected closePlayerForm(): void {
    this.playerFormOpen.set(false);
  }

  protected goToCalendar(): void {
    void this.router.navigate(['/calendario']);
  }

  protected goToPlayers(): void {
    void this.router.navigate(['/jugadores']);
  }

  protected goToCoachMode(): void {
    void this.router.navigate(['/modo-coach']);
  }

  protected goToMyProfile(): void {
    void this.router.navigate(['/perfil']);
  }

  // ------------------------------------------------------------------
  // Dashboard del Jugador (rol 'player')
  // ------------------------------------------------------------------

  protected readonly playerGreeting = computed(() => {
    const firstName =
      this.currentAthlete()?.firstName ?? this.authService.user()?.name.split(' ')[0] ?? '';
    const hour = this.today.getHours();
    if (hour < 6) return `Buenas noches, ${firstName}`;
    if (hour < 12) return `¡Hola, ${firstName}!`;
    if (hour < 20) return `¡Hola, ${firstName}!`;
    return `Buenas noches, ${firstName}`;
  });

  protected readonly athleteStatusBadge = computed(() =>
    this.currentAthlete()?.playerType === 'invitado' ? 'Invitado' : 'Atleta Regular',
  );

  protected readonly dominantHandLabel = computed(() =>
    this.currentAthlete()?.dominantHand === 'izquierda' ? 'Izquierda' : 'Derecha',
  );

  /** Los principiantes no tienen paleta declarada: se muestra "Sin especificar". */
  protected readonly paddleGripLabel = computed(() =>
    paddleGripLabel(this.currentAthlete()?.paddleGrip),
  );

  protected readonly categoryLabel = computed(() => {
    const category = this.currentAthlete()?.category;
    return category === undefined ? '-' : categoryLabel(category);
  });

  protected readonly todaysMesocyclePlan = computed(() => {
    const athleteId = this.authService.user()?.athleteId;
    if (athleteId === undefined) return null;
    return dailyMesocyclePlan(this.atletaService.profileFor(athleteId).macrocycles, this.today);
  });

  protected readonly playerStats = computed<PlayerStats>(() => ({
    monthlyAttendance: this.currentAthlete()?.attendance ?? 95,
    tableHours: 24,
    streak: 6,
  }));

  protected readonly upcomingCompetitions = computed(() => {
    const athleteId = this.authService.user()?.athleteId;
    if (athleteId === undefined) return [];
    const today = atMidnight(new Date()).getTime();
    return this.atletaService
      .profileFor(athleteId)
      .competitions.filter((competition) => competition.date.getTime() >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  protected readonly nextCompetition = computed(() => this.upcomingCompetitions()[0] ?? null);

  protected readonly nextTraining = computed<TrainingSession | null>(() => {
    const athleteId = this.authService.user()?.athleteId;
    if (athleteId === undefined) return null;
    const today = atMidnight(new Date()).getTime();
    return this.calendarService
      .sessions()
      .filter(
        (session) =>
          session.date.getTime() >= today &&
          session.attendances.some(
            (attendance) =>
              attendance.playerId === athleteId && attendance.status === 'confirmado',
          ),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  });

  protected readonly formattedNextTrainingDate = computed(() => {
    const session = this.nextTraining();
    if (!session) return '';
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        session.date,
      ),
    );
  });

  protected formatCompetitionDate(date: Date): string {
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        date,
      ),
    );
  }

  protected competitionLevelLabel(level: CompetitionLevel): string {
    const labels: Record<CompetitionLevel, string> = {
      club: 'Club',
      regional: 'Regional',
      nacional: 'Nacional',
      internacional: 'Internacional',
    };
    return labels[level];
  }

  protected daysUntil(date: Date): number {
    const diffMs = atMidnight(date).getTime() - atMidnight(new Date()).getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // ------------------------------------------------------------------
  // Gráfico de avance del atleta (datos mockeados)
  // ------------------------------------------------------------------

  protected readonly progressRanges: ProgressRange[] = ['8-semanas', '6-meses'];
  protected readonly progressRangeLabels = PROGRESS_RANGE_LABELS;
  protected readonly selectedRange = signal<ProgressRange>('8-semanas');

  private readonly progressPoints = computed(() => PROGRESS_BY_RANGE[this.selectedRange()]);

  protected readonly progressLabels = computed(() =>
    this.progressPoints().map((point) => point.label),
  );

  protected readonly progressSeries = computed<ProgressSeries[]>(() => {
    const points = this.progressPoints();
    return [
      {
        label: 'Progresión técnica',
        data: points.map((point) => point.skillScore),
        color: '#0d9488',
        fill: true,
      },
      {
        label: 'Asistencia (%)',
        data: points.map((point) => point.attendanceRate),
        color: '#f59e0b',
      },
    ];
  });

  /** Puntos de progresión técnica ganados en el rango elegido, para el resumen del encabezado. */
  protected readonly skillGain = computed(() => {
    const points = this.progressPoints();
    if (points.length < 2) return 0;
    return points[points.length - 1].skillScore - points[0].skillScore;
  });

  protected readonly rangeSummaryLabel = computed(
    () => `en las últimas ${PROGRESS_RANGE_LABELS[this.selectedRange()]}`,
  );

  /** Horas de mesa acumuladas en el rango elegido. */
  protected readonly rangeTableHours = computed(() =>
    this.progressPoints().reduce((sum, point) => sum + point.tableHours, 0),
  );

  protected selectRange(range: ProgressRange): void {
    this.selectedRange.set(range);
  }
}
