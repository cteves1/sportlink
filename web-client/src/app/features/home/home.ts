import { Component, computed, inject, signal } from '@angular/core';
import {
  LucideCircleCheck,
  LucideCircleX,
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
  LucideTimer,
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
import { TimerModal } from '../../shared/timer-modal/timer-modal';
import { PROGRESS_BY_RANGE, PROGRESS_RANGE_LABELS, ProgressRange } from './progress.mock';

interface Athlete {
  id: number;
  name: string;
  initials: string;
  status: 'presente' | 'ausente' | 'pendiente';
}

interface WeeklyAttendance {
  percentage: number;
}

interface TableStatus {
  total: number;
  inUse: number;
}

interface UpcomingTournament {
  name: string;
  date: Date;
  location: string;
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

interface NextTraining {
  dayLabel: string;
  date: Date;
  time: string;
  table: string;
  focus: string;
}

interface CoachNote {
  text: string;
  updatedAt: Date;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    PlayerFormModal,
    ProgressChart,
    TimerModal,
    LucideUsers,
    LucidePercent,
    LucideTableProperties,
    LucideClipboardCheck,
    LucideUserPlus,
    LucideTimer,
    LucideCircleCheck,
    LucideCircleX,
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
export class Home {
  private readonly authService = inject(AuthService);
  private readonly playersService = inject(PlayersService);
  private readonly router = inject(Router);

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

  protected readonly activeAthletesCount = signal(18);

  protected readonly weeklyAttendance = signal<WeeklyAttendance>({ percentage: 92 });

  protected readonly tableStatus = signal<TableStatus>({ total: 6, inUse: 4 });

  protected readonly trainingFocus = signal('Multibola - Enfoque en Topspin de Derecha');

  protected readonly todaysAthletes = signal<Athlete[]>([
    { id: 1, name: 'Matías Fernández', initials: 'MF', status: 'presente' },
    { id: 2, name: 'Sofía Rojas', initials: 'SR', status: 'presente' },
    { id: 3, name: 'Diego Vargas', initials: 'DV', status: 'ausente' },
    { id: 4, name: 'Camila Torres', initials: 'CT', status: 'presente' },
    { id: 5, name: 'Ignacio Soto', initials: 'IS', status: 'pendiente' },
    { id: 6, name: 'Valentina Muñoz', initials: 'VM', status: 'presente' },
  ]);

  protected readonly presentCount = computed(
    () => this.todaysAthletes().filter((athlete) => athlete.status === 'presente').length,
  );

  protected readonly upcomingTournament = signal<UpcomingTournament>({
    name: 'Copa Regional Sub-18',
    date: new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + 12),
    location: 'Complejo Deportivo Municipal',
  });

  protected readonly daysUntilTournament = computed(() => {
    const diffMs = this.upcomingTournament().date.getTime() - this.today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
  protected readonly timerOpen = signal(false);

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

  protected openTimer(): void {
    this.timerOpen.set(true);
  }

  protected closeTimer(): void {
    this.timerOpen.set(false);
  }

  protected statusLabel(status: Athlete['status']): string {
    switch (status) {
      case 'presente':
        return 'Presente';
      case 'ausente':
        return 'Ausente';
      default:
        return 'Pendiente';
    }
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

  protected readonly coachNote = signal<CoachNote>({
    text: 'Mejorar la flexión de piernas en el desplazamiento lateral. En el topspin de revés, recuerda terminar el golpe hacia adelante y no tan arriba.',
    updatedAt: new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() - 2),
  });

  protected readonly playerStats = computed<PlayerStats>(() => ({
    monthlyAttendance: this.currentAthlete()?.attendance ?? 95,
    tableHours: 24,
    streak: 6,
  }));

  protected readonly nextTraining = signal<NextTraining>({
    dayLabel: 'Jueves',
    date: new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + 2),
    time: '18:00 - 20:00',
    table: 'Mesa 2',
    focus: 'Servicio y Ataque de Tercera Bola',
  });

  protected readonly formattedNoteDate = computed(() =>
    new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(
      this.coachNote().updatedAt,
    ),
  );

  protected readonly formattedNextTrainingDate = computed(() =>
    new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
      this.nextTraining().date,
    ),
  );

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
