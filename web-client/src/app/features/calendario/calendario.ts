import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCalendarDays,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideCircleX,
  LucideClock,
  LucideLayoutGrid,
  LucideList,
  LucideRotateCcw,
  LucideUserRound,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { CalendarService } from './calendar.service';
import { TrainingSession, UserRole } from './calendar.models';
import { AuthService } from '../../core/auth/auth.service';
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
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCircleX,
    LucideClock,
    LucideLayoutGrid,
    LucideList,
    LucideRotateCcw,
    LucideUserRound,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './calendario.html',
})
export class Calendario {
  protected readonly calendarService = inject(CalendarService);
  private readonly authService = inject(AuthService);

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

  protected readonly viewMode = signal<ViewMode>('mes');
  protected readonly cursorDate = signal<Date>(atMidnight(new Date()));
  protected readonly selectedDate = signal<Date | null>(null);
  protected readonly selectedSessionId = signal<number | null>(null);
  /** Clave `sessionId:attendanceId` de la reserva que está pidiendo confirmación de cancelación. */
  protected readonly confirmingKey = signal<string | null>(null);

  private readonly today = atMidnight(new Date());

  protected readonly monthLabel = computed(() =>
    capitalize(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(this.cursorDate())),
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

  /** Próximos turnos del jugador simulado actual (Vista Jugador), ordenados por fecha. */
  protected readonly myBookings = computed(() => {
    const playerId = this.currentPlayerId();
    return this.calendarService
      .sessions()
      .filter((session) => session.date.getTime() >= this.today.getTime())
      .map((session) => ({ session, attendance: this.calendarService.attendanceFor(session, playerId) }))
      .filter((entry): entry is { session: TrainingSession; attendance: NonNullable<typeof entry.attendance> } =>
        Boolean(entry.attendance),
      )
      .sort((a, b) => a.session.date.getTime() - b.session.date.getTime());
  });

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

  protected formatDayNumber(date: Date): number {
    return date.getDate();
  }

  protected formatFullDate(date: Date): string {
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date),
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

  /** Clases del badge de categoría: cat 1 destaca como élite, 2-3 azul, 4-5 verde, 6-8 gris (novato). */
  protected categoryBadgeClasses(category: number): string {
    if (category === 1) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-300';
    if (category <= 3) return 'bg-blue-100 text-blue-700';
    if (category <= 5) return 'bg-brand-100 text-brand-700';
    return 'bg-gray-100 text-gray-600';
  }
}
