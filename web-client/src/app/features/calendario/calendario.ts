import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideCalendarDays,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideCirclePlus,
  LucideCircleX,
  LucideClipboardCheck,
  LucideClock,
  LucideLayoutGrid,
  LucideList,
  LucideLock,
  LucideRotateCcw,
  LucideUserRound,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { CalendarService } from './calendar.service';
import { Attendance, Presence, TrainingSession, UserRole } from './calendar.models';
import { AuthService } from '../../core/auth/auth.service';
import {
  Category,
  PlayersService,
  categoryBadgeClasses,
  categoryLabel,
} from '../../core/players/players.service';
import {
  WEEKDAY_LABELS,
  addDays,
  atMidnight,
  capitalize,
  dateKey,
  isSameDay,
  startOfWeek,
} from '../../core/date/calendar-dates';

type ViewMode = 'mes' | 'semana';

interface CalendarCell {
  date: Date;
  inCurrentPeriod: boolean;
  isToday: boolean;
  sessions: TrainingSession[];
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [
    FormsModule,
    LucideCalendarDays,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCirclePlus,
    LucideCircleX,
    LucideClipboardCheck,
    LucideClock,
    LucideLayoutGrid,
    LucideList,
    LucideLock,
    LucideRotateCcw,
    LucideUserRound,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './calendario.html',
})
export class Calendario implements OnInit {
  protected readonly calendarService = inject(CalendarService);
  private readonly authService = inject(AuthService);
  private readonly playersService = inject(PlayersService);
  private readonly route = inject(ActivatedRoute);

  protected readonly weekdayLabels = WEEKDAY_LABELS;

  protected readonly role = this.calendarService.role;
  protected readonly players = this.calendarService.players;
  protected readonly currentPlayerId = this.calendarService.currentPlayerId;

  /** true si el usuario autenticado es un jugador: bloquea el cambio manual de vista/jugador. */
  protected readonly isPlayerAccount = computed(() => this.authService.user()?.role === 'player');

  constructor() {
    // Un jugador autenticado siempre ve su propia Vista Jugador, sin poder cambiarla manualmente.
    effect(() => {
      const authUser = this.authService.user();
      if (authUser?.role === 'player') {
        this.calendarService.setRole('jugador');
        if (authUser.athleteId !== undefined) {
          this.calendarService.setCurrentPlayer(authUser.athleteId);
        }
      }
    });
  }

  /** La acción rápida "Registrar Asistencia" del Home entra con ?asistencia=hoy. */
  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('asistencia') === 'hoy') {
      this.openTodayAttendance();
    }
  }

  protected readonly viewMode = signal<ViewMode>('mes');
  protected readonly cursorDate = signal<Date>(atMidnight(new Date()));
  protected readonly selectedDate = signal<Date | null>(null);
  protected readonly selectedSessionId = signal<number | null>(null);
  /** Clave `sessionId:attendanceId` de la reserva que está pidiendo confirmación de cancelación. */
  protected readonly confirmingKey = signal<string | null>(null);

  private readonly today = atMidnight(new Date());

  protected readonly monthLabel = computed(() =>
    capitalize(
      new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(
        this.cursorDate(),
      ),
    ),
  );

  protected readonly weekRangeLabel = computed(() => {
    const start = startOfWeek(this.cursorDate());
    const end = addDays(start, 6);
    const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  });

  protected readonly monthGrid = computed<CalendarCell[]>(() => {
    const cursor = this.cursorDate();
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth);
    const byDate = this.calendarService.sessionsByDateKey();

    return Array.from({ length: 42 }, (_, i) => {
      const date = addDays(gridStart, i);
      return {
        date,
        inCurrentPeriod: date.getMonth() === cursor.getMonth(),
        isToday: isSameDay(date, this.today),
        sessions: byDate.get(dateKey(date)) ?? [],
      };
    });
  });

  protected readonly weekGrid = computed<CalendarCell[]>(() => {
    const start = startOfWeek(this.cursorDate());
    const byDate = this.calendarService.sessionsByDateKey();

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        inCurrentPeriod: true,
        isToday: isSameDay(date, this.today),
        sessions: byDate.get(dateKey(date)) ?? [],
      };
    });
  });

  protected readonly activeGrid = computed(() =>
    this.viewMode() === 'mes' ? this.monthGrid() : this.weekGrid(),
  );

  protected readonly selectedDaySessions = computed<TrainingSession[]>(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.calendarService.sessionsByDateKey().get(dateKey(date)) ?? [];
  });

  protected readonly selectedSession = computed<TrainingSession | null>(() => {
    const id = this.selectedSessionId();
    if (id === null) return null;
    return this.selectedDaySessions().find((s) => s.id === id) ?? null;
  });

  /** Próximos turnos del jugador actual (Vista Jugador), ordenados por fecha. */
  protected readonly myBookings = computed(() => {
    const playerId = this.currentPlayer().id;
    return this.calendarService
      .sessions()
      .filter((session) => session.date.getTime() >= this.today.getTime())
      .map((session) => ({
        session,
        attendance: this.calendarService.attendanceFor(session, playerId),
      }))
      .filter(
        (
          entry,
        ): entry is {
          session: TrainingSession;
          attendance: NonNullable<typeof entry.attendance>;
        } => Boolean(entry.attendance),
      )
      .sort((a, b) => a.session.date.getTime() - b.session.date.getTime());
  });

  // ------------------------------------------------------------------
  // Reserva de cupos (Vista Jugador)
  // ------------------------------------------------------------------

  /**
   * Jugador que actúa en la Vista Jugador: la cuenta autenticada si es un jugador real,
   * o el jugador mock elegido en el selector cuando el entrenador simula la vista.
   */
  protected readonly currentPlayer = computed<{ id: number; name: string; category: number }>(
    () => {
      const authUser = this.authService.user();
      if (authUser?.role === 'player' && authUser.athleteId !== undefined) {
        const athlete = this.playersService
          .athletes()
          .find((candidate) => candidate.id === authUser.athleteId);
        if (athlete) {
          return {
            id: athlete.id,
            name: `${athlete.firstName} ${athlete.lastName}`,
            category: athlete.category,
          };
        }
        return { id: authUser.athleteId, name: authUser.name, category: 8 };
      }

      const playerId = this.currentPlayerId();
      const mock = this.players.find((player) => player.id === playerId) ?? this.players[0];
      return { id: mock.id, name: mock.name, category: mock.category };
    },
  );

  /** Reserva del jugador actual en un turno, si existe (confirmada o cancelada). */
  protected myAttendance(session: TrainingSession): Attendance | undefined {
    return this.calendarService.attendanceFor(session, this.currentPlayer().id);
  }

  protected freeSlots(session: TrainingSession): number {
    return this.calendarService.freeSlots(session);
  }

  protected isFull(session: TrainingSession): boolean {
    return !this.calendarService.hasFreeSlot(session);
  }

  /** Un turno ya pasado no admite reservas ni cancelaciones. */
  protected isPastSession(session: TrainingSession): boolean {
    return atMidnight(session.date).getTime() < this.today.getTime();
  }

  /** El jugador puede ocupar un cupo si el turno es futuro, tiene lugar y todavía no reservó. */
  protected canBook(session: TrainingSession): boolean {
    if (this.isPastSession(session) || this.isFull(session)) return false;
    return this.myAttendance(session)?.status !== 'confirmado';
  }

  protected bookSlot(session: TrainingSession): void {
    this.calendarService.bookAttendance(session.id, this.currentPlayer());
  }

  // ------------------------------------------------------------------
  // Registro de asistencia de hoy (Vista Entrenador)
  // ------------------------------------------------------------------

  protected readonly attendanceOpen = signal(false);
  protected readonly attendanceSessionId = signal<number | null>(null);

  protected readonly todaySessions = computed(() =>
    this.calendarService.sessionsForDate(this.today),
  );

  protected readonly attendanceSession = computed<TrainingSession | null>(() => {
    const id = this.attendanceSessionId();
    return this.todaySessions().find((session) => session.id === id) ?? null;
  });

  protected readonly todayLabel = computed(() => this.formatFullDate(this.today));

  /** Abre el registro de asistencia de hoy preseleccionando el turno en curso (o el primero). */
  protected openTodayAttendance(): void {
    this.calendarService.setRole('entrenador');
    this.attendanceSessionId.set(this.currentShiftId());
    this.attendanceOpen.set(true);
  }

  protected closeAttendance(): void {
    this.attendanceOpen.set(false);
    this.attendanceSessionId.set(null);
  }

  protected selectAttendanceSession(sessionId: number): void {
    this.attendanceSessionId.set(sessionId);
  }

  /** Marca (o desmarca, si se repite el clic) la presencia real de un jugador en el turno abierto. */
  protected setPresence(attendance: Attendance, presence: Exclude<Presence, null>): void {
    const sessionId = this.attendanceSessionId();
    if (sessionId === null) return;
    const next = attendance.presence === presence ? null : presence;
    this.calendarService.setPresence(sessionId, attendance.id, next);
  }

  protected presentCount(session: TrainingSession): number {
    return this.calendarService.presentCount(session);
  }

  /** Turno de hoy cuyo horario contiene la hora actual; si no hay ninguno, el primero del día. */
  private currentShiftId(): number | null {
    const sessions = this.todaySessions();
    if (sessions.length === 0) return null;
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const ongoing = sessions.find(
      (session) =>
        minutesNow >= this.toMinutes(session.startTime) &&
        minutesNow <= this.toMinutes(session.endTime),
    );
    return (ongoing ?? sessions[0]).id;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  protected setRole(role: UserRole): void {
    this.calendarService.setRole(role);
    this.selectedDate.set(null);
    this.selectedSessionId.set(null);
    this.confirmingKey.set(null);
  }

  protected setCurrentPlayer(playerId: number): void {
    this.calendarService.setCurrentPlayer(Number(playerId));
    this.confirmingKey.set(null);
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected goToPrevious(): void {
    this.shiftCursor(-1);
  }

  protected goToNext(): void {
    this.shiftCursor(1);
  }

  protected goToday(): void {
    this.cursorDate.set(atMidnight(new Date()));
  }

  private shiftCursor(direction: 1 | -1): void {
    const cursor = this.cursorDate();
    if (this.viewMode() === 'mes') {
      this.cursorDate.set(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1));
    } else {
      this.cursorDate.set(addDays(cursor, direction * 7));
    }
  }

  protected isSelectedDay(date: Date): boolean {
    const selected = this.selectedDate();
    return selected !== null && isSameDay(selected, date);
  }

  protected selectDay(date: Date): void {
    const current = this.selectedDate();
    this.selectedSessionId.set(null);
    this.selectedDate.set(current && isSameDay(current, date) ? null : date);
  }

  protected closeDetailPanel(): void {
    this.selectedDate.set(null);
    this.selectedSessionId.set(null);
  }

  protected toggleSession(sessionId: number): void {
    this.selectedSessionId.update((current) => (current === sessionId ? null : sessionId));
  }

  protected requestCancel(sessionId: number, attendanceId: number): void {
    this.confirmingKey.set(`${sessionId}:${attendanceId}`);
  }

  protected dismissCancel(): void {
    this.confirmingKey.set(null);
  }

  protected confirmCancel(sessionId: number, attendanceId: number): void {
    this.calendarService.cancelAttendance(sessionId, attendanceId);
    this.confirmingKey.set(null);
  }

  protected undoCancel(sessionId: number, attendanceId: number): void {
    this.calendarService.restoreAttendance(sessionId, attendanceId);
  }

  protected isConfirming(sessionId: number, attendanceId: number): boolean {
    return this.confirmingKey() === `${sessionId}:${attendanceId}`;
  }

  protected confirmedCount(session: TrainingSession): number {
    return this.calendarService.confirmedCount(session);
  }

  protected dayTotalConfirmed(cell: CalendarCell): number {
    return cell.sessions.reduce((sum, s) => sum + this.confirmedCount(s), 0);
  }

  protected dayTotalCapacity(cell: CalendarCell): number {
    return cell.sessions.reduce((sum, s) => sum + s.capacity, 0);
  }

  /** Cupos libres sumando todos los turnos del día, para destacar dónde hay lugar. */
  protected dayTotalFreeSlots(cell: CalendarCell): number {
    return cell.sessions.reduce((sum, s) => sum + this.freeSlots(s), 0);
  }

  protected formatDayNumber(date: Date): number {
    return date.getDate();
  }

  protected formatFullDate(date: Date): string {
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        date,
      ),
    );
  }

  /** Clases del badge de ocupación del día: rojo si está lleno, ámbar si casi lleno, verde si hay cupo amplio. */
  protected dayOccupancyClasses(cell: CalendarCell): string {
    if (cell.sessions.length === 0) return 'bg-gray-100 text-gray-400';
    const confirmed = this.dayTotalConfirmed(cell);
    const capacity = this.dayTotalCapacity(cell);
    const ratio = capacity === 0 ? 0 : confirmed / capacity;
    if (ratio >= 1) return 'bg-red-100 text-red-700';
    if (ratio >= 0.7) return 'bg-amber-100 text-amber-700';
    return 'bg-brand-100 text-brand-700';
  }

  /**
   * Las asistencias y los jugadores mock guardan la categoría como `number` (demo sin
   * backend), así que se acota al rango válido antes de delegar en los helpers compartidos.
   */
  private toCategory(category: number): Category {
    return Math.min(9, Math.max(0, Math.trunc(category))) as Category;
  }

  protected categoryLabel(category: number): string {
    return categoryLabel(this.toCategory(category));
  }

  protected categoryBadgeClasses(category: number): string {
    return categoryBadgeClasses(this.toCategory(category));
  }
}
