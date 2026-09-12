import { Component, computed, inject, input, signal } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import {
  WEEKDAY_LABELS,
  addDays,
  atMidnight,
  capitalize,
  dateKey,
  isSameDay,
  startOfWeek,
} from '../../../core/date/calendar-dates';
import { AttendanceDay, AttendanceDayStatus } from '../atleta.models';
import { AtletaService } from '../atleta.service';

interface AttendanceCell {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  record: AttendanceDay | undefined;
}

interface MonthSummary {
  planned: number;
  present: number;
  absent: number;
  justified: number;
  competition: number;
  /** Porcentaje de asistencia sobre los días planificados (excluye competencias). */
  rate: number;
}

const STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificado',
  competencia: 'Competencia',
  descanso: 'Descanso',
};

@Component({
  selector: 'app-atleta-asistencia',
  standalone: true,
  imports: [LucideChevronLeft, LucideChevronRight],
  templateUrl: './atleta-asistencia.html',
})
export class AtletaAsistencia {
  private readonly atletaService = inject(AtletaService);

  readonly athleteId = input.required<number>();

  protected readonly weekdayLabels = WEEKDAY_LABELS;

  private readonly today = atMidnight(new Date());

  protected readonly profile = computed(() => this.atletaService.profileFor(this.athleteId()));

  /** Mes elegido por el usuario; `null` hasta que navega y se usa el mes actual. */
  private readonly selectedMonth = signal<number | null>(null);

  /** Asistencia indexada por clave 'yyyy-mm-dd' para no recorrer el arreglo por celda. */
  private readonly attendanceByKey = computed(() => {
    const map = new Map<string, AttendanceDay>();
    for (const day of this.profile().attendance) {
      map.set(day.dateKey, day);
    }
    return map;
  });

  protected readonly year = computed(() => this.profile().year);

  /** Meses con asistencia registrada, para los chips de navegación rápida. */
  protected readonly availableMonths = computed(() => {
    const months = new Set<number>();
    for (const day of this.profile().attendance) {
      months.add(Number(day.dateKey.slice(5, 7)) - 1);
    }
    return [...months].sort((a, b) => a - b);
  });

  /**
   * Mes visible en la grilla (0 = enero): el elegido por el usuario o el mes
   * actual acotado al rango con asistencia registrada (marzo a diciembre).
   */
  protected readonly cursorMonth = computed(() => {
    const selected = this.selectedMonth();
    if (selected !== null) return selected;

    const months = this.availableMonths();
    if (months.length === 0) return new Date().getMonth();

    const currentMonth = new Date().getMonth();
    return Math.min(Math.max(currentMonth, months[0]), months[months.length - 1]);
  });

  protected readonly monthLabel = computed(() =>
    capitalize(
      new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(
        new Date(this.year(), this.cursorMonth(), 1),
      ),
    ),
  );

  protected readonly monthGrid = computed<AttendanceCell[]>(() => {
    const firstOfMonth = new Date(this.year(), this.cursorMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth);
    const byKey = this.attendanceByKey();

    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const key = dateKey(date);
      return {
        date,
        dateKey: key,
        inCurrentMonth: date.getMonth() === this.cursorMonth(),
        isToday: isSameDay(date, this.today),
        record: byKey.get(key),
      };
    });
  });

  protected readonly monthSummary = computed<MonthSummary>(() =>
    this.summarize(this.monthGrid().filter((cell) => cell.inCurrentMonth).map((cell) => cell.record)),
  );

  protected readonly yearSummary = computed<MonthSummary>(() => this.summarize(this.profile().attendance));

  protected canGoPrevious = computed(() => this.cursorMonth() > this.availableMonths()[0]);

  protected canGoNext = computed(
    () => this.cursorMonth() < this.availableMonths()[this.availableMonths().length - 1],
  );

  protected selectMonth(month: number): void {
    this.selectedMonth.set(month);
  }

  protected goToPreviousMonth(): void {
    if (this.canGoPrevious()) this.selectedMonth.set(this.cursorMonth() - 1);
  }

  protected goToNextMonth(): void {
    if (this.canGoNext()) this.selectedMonth.set(this.cursorMonth() + 1);
  }

  /** Click en un día planificado: rota su estado (presente → ausente → justificado → competencia). */
  protected cycleStatus(cell: AttendanceCell): void {
    if (!cell.record) return;
    this.atletaService.cycleAttendanceStatus(this.athleteId(), cell.dateKey);
  }

  protected monthShortLabel(month: number): string {
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(this.year(), month, 1)),
    ).replace('.', '');
  }

  protected statusLabel(status: AttendanceDayStatus): string {
    return STATUS_LABELS[status];
  }

  /** Clases de la celda según el estado del día (gris si no había entrenamiento planificado). */
  protected statusCellClasses(record: AttendanceDay | undefined): string {
    if (!record) return 'border-gray-200 bg-white';
    switch (record.status) {
      case 'presente':
        return 'border-brand-200 bg-brand-50';
      case 'ausente':
        return 'border-red-200 bg-red-50';
      case 'justificado':
        return 'border-amber-200 bg-amber-50';
      case 'competencia':
        return 'border-blue-200 bg-blue-50';
      case 'descanso':
        return 'border-gray-200 bg-gray-50';
    }
  }

  protected statusBadgeClasses(status: AttendanceDayStatus): string {
    switch (status) {
      case 'presente':
        return 'bg-brand-100 text-brand-700';
      case 'ausente':
        return 'bg-red-100 text-red-700';
      case 'justificado':
        return 'bg-amber-100 text-amber-800';
      case 'competencia':
        return 'bg-blue-100 text-blue-700';
      case 'descanso':
        return 'bg-gray-100 text-gray-600';
    }
  }

  private summarize(records: (AttendanceDay | undefined)[]): MonthSummary {
    const days = records.filter((record): record is AttendanceDay => record !== undefined);
    const countOf = (status: AttendanceDayStatus) => days.filter((day) => day.status === status).length;

    const present = countOf('presente');
    const absent = countOf('ausente');
    const justified = countOf('justificado');
    const competition = countOf('competencia');
    const planned = present + absent + justified;

    return {
      planned,
      present,
      absent,
      justified,
      competition,
      rate: planned === 0 ? 0 : Math.round((present / planned) * 100),
    };
  }
}
