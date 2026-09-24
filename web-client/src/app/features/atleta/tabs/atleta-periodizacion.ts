import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucidePlus,
  LucideTarget,
  LucideTrash2,
  LucideTrophy,
  LucideX,
} from '@lucide/angular';
import { WEEKDAY_OPTIONS } from '../../../core/players/players.service';
import { capitalize } from '../../../core/date/calendar-dates';
import {
  Competition,
  Macrocycle,
  Mesocycle,
  MesocyclePhase,
  MicrocycleDay,
  TrainingLoad,
  WorkType,
} from '../atleta.models';
import { AtletaService } from '../atleta.service';
import {
  LOAD_OPTIONS,
  MESOCYCLE_PHASE_BAR_CLASSES,
  MESOCYCLE_PHASE_CLASSES,
  MESOCYCLE_PHASE_LABELS,
  MacrocycleInput,
  PHASE_OPTIONS,
  TRAINING_LOAD_CLASSES,
  TRAINING_LOAD_LABELS,
  WORK_TYPE_LABELS,
  WORK_TYPE_OPTIONS,
  weeksBetween,
} from '../periodization';

/** Tramo de la línea de tiempo: posición y ancho en porcentaje del macrociclo. */
interface TimelineSegment {
  mesocycle: Mesocycle;
  leftPct: number;
  widthPct: number;
}

interface TimelineMonth {
  label: string;
  leftPct: number;
  widthPct: number;
}

/** Marca puntual sobre la línea de tiempo (torneo o fecha objetivo). */
interface TimelineMarker {
  label: string;
  leftPct: number;
  isTarget: boolean;
}

const MS_PER_DAY = 86_400_000;

/** Fecha de un <input type="date"> leída en horario local (evita el corrimiento de un día por UTC). */
function parseDateInput(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Planificación por ciclos del atleta: el entrenador define el macrociclo (período con un
 * objetivo al final) y la app lo reparte en mesociclos de varias semanas, cada uno con su
 * fase, su carga y el microciclo día a día. Todo queda editable.
 */
@Component({
  selector: 'app-atleta-periodizacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LucideChevronDown,
    LucideChevronUp,
    LucidePlus,
    LucideTarget,
    LucideTrash2,
    LucideTrophy,
    LucideX,
  ],
  templateUrl: './atleta-periodizacion.html',
})
export class AtletaPeriodizacion {
  private readonly fb = inject(FormBuilder);
  private readonly atletaService = inject(AtletaService);

  readonly athleteId = input.required<number>();

  protected readonly weekdays = WEEKDAY_OPTIONS;
  protected readonly phaseOptions = PHASE_OPTIONS;
  protected readonly loadOptions = LOAD_OPTIONS;
  protected readonly workTypeOptions = WORK_TYPE_OPTIONS;
  protected readonly phaseLabel = (phase: MesocyclePhase) => MESOCYCLE_PHASE_LABELS[phase];
  protected readonly phaseClasses = (phase: MesocyclePhase) => MESOCYCLE_PHASE_CLASSES[phase];
  protected readonly loadLabel = (load: TrainingLoad) => TRAINING_LOAD_LABELS[load];
  protected readonly loadClasses = (load: TrainingLoad) => TRAINING_LOAD_CLASSES[load];
  protected readonly workTypeLabel = (workType: WorkType) => WORK_TYPE_LABELS[workType];

  private readonly profile = computed(() => this.atletaService.profileFor(this.athleteId()));

  protected readonly macrocycles = computed(() => this.profile().macrocycles);

  /** Macrociclo abierto; si el seleccionado ya no existe se cae al primero. */
  protected readonly selectedId = signal<number | null>(null);

  protected readonly selected = computed<Macrocycle | null>(() => {
    const macrocycles = this.macrocycles();
    if (macrocycles.length === 0) return null;
    return macrocycles.find((macro) => macro.id === this.selectedId()) ?? macrocycles[0];
  });

  protected readonly formOpen = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Mesociclo cuyo microciclo está desplegado. */
  protected readonly expandedMesocycleId = signal<number | null>(null);
  protected readonly confirmingDelete = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: [`Temporada ${new Date().getFullYear()}`, Validators.required],
    startDate: [toDateInput(new Date()), Validators.required],
    endDate: ['', Validators.required],
    targetEvent: ['', Validators.required],
    targetDate: [''],
    goal: [''],
    weeksPerMesocycle: [4, [Validators.required, Validators.min(1), Validators.max(12)]],
  });

  // ------------------------------------------------------------------
  // Línea de tiempo anual
  // ------------------------------------------------------------------

  private readonly span = computed<{ start: number; total: number } | null>(() => {
    const macrocycle = this.selected();
    if (!macrocycle) return null;
    const start = macrocycle.startDate.getTime();
    const total = Math.max(MS_PER_DAY, macrocycle.endDate.getTime() - start);
    return { start, total };
  });

  protected readonly segments = computed<TimelineSegment[]>(() => {
    const span = this.span();
    const macrocycle = this.selected();
    if (!span || !macrocycle) return [];

    return macrocycle.mesocycles.map((mesocycle) => ({
      mesocycle,
      leftPct: this.toPct(mesocycle.startDate.getTime(), span),
      widthPct: Math.max(
        1,
        ((mesocycle.endDate.getTime() - mesocycle.startDate.getTime()) / span.total) * 100,
      ),
    }));
  });

  /** Meses que abarca el macrociclo, posicionados por tiempo para alinear con las barras. */
  protected readonly months = computed<TimelineMonth[]>(() => {
    const span = this.span();
    const macrocycle = this.selected();
    if (!span || !macrocycle) return [];

    const months: TimelineMonth[] = [];
    const end = macrocycle.endDate;
    let cursor = new Date(macrocycle.startDate.getFullYear(), macrocycle.startDate.getMonth(), 1);

    while (cursor.getTime() <= end.getTime()) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const from = Math.max(cursor.getTime(), span.start);
      const to = Math.min(next.getTime(), span.start + span.total);
      months.push({
        label: capitalize(new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(cursor)),
        leftPct: this.toPct(from, span),
        widthPct: ((to - from) / span.total) * 100,
      });
      cursor = next;
    }

    return months;
  });

  /** Torneos del atleta dentro del macrociclo, más la fecha objetivo. */
  protected readonly markers = computed<TimelineMarker[]>(() => {
    const span = this.span();
    const macrocycle = this.selected();
    if (!span || !macrocycle) return [];

    const within = (date: Date) =>
      date.getTime() >= span.start && date.getTime() <= span.start + span.total;

    const competitions: TimelineMarker[] = this.profile()
      .competitions.filter((competition: Competition) => within(competition.date))
      .map((competition) => ({
        label: competition.name,
        leftPct: this.toPct(competition.date.getTime(), span),
        isTarget: false,
      }));

    const target = macrocycle.targetDate;
    if (target && within(target)) {
      competitions.push({
        label: macrocycle.targetEvent || 'Objetivo',
        leftPct: this.toPct(target.getTime(), span),
        isTarget: true,
      });
    }

    return competitions;
  });

  private toPct(time: number, span: { start: number; total: number }): number {
    return Math.min(100, Math.max(0, ((time - span.start) / span.total) * 100));
  }

  // ------------------------------------------------------------------
  // Alta y edición del macrociclo
  // ------------------------------------------------------------------

  protected selectMacrocycle(macrocycleId: number): void {
    this.selectedId.set(macrocycleId);
    this.expandedMesocycleId.set(null);
  }

  protected openForm(): void {
    this.error.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const startDate = parseDateInput(value.startDate);
    const endDate = parseDateInput(value.endDate);
    const targetDate = value.targetDate ? parseDateInput(value.targetDate) : null;

    if (!startDate || !endDate) {
      this.error.set('Revisa las fechas del macrociclo.');
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      this.error.set('La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    if (targetDate && (targetDate < startDate || targetDate > endDate)) {
      this.error.set('La fecha del objetivo tiene que caer dentro del macrociclo.');
      return;
    }

    const input: MacrocycleInput = {
      name: value.name.trim(),
      startDate,
      endDate,
      targetEvent: value.targetEvent.trim(),
      targetDate,
      goal: value.goal.trim(),
      weeksPerMesocycle: Number(value.weeksPerMesocycle),
    };

    const created = this.atletaService.createMacrocycle(this.athleteId(), input);
    this.selectedId.set(created.id);
    this.formOpen.set(false);
    this.error.set(null);
  }

  protected requestDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected dismissDelete(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(macrocycleId: number): void {
    this.atletaService.deleteMacrocycle(this.athleteId(), macrocycleId);
    this.confirmingDelete.set(false);
    this.selectedId.set(null);
  }

  // ------------------------------------------------------------------
  // Ajustes de mesociclo y microciclo
  // ------------------------------------------------------------------

  protected toggleMesocycle(mesocycleId: number): void {
    this.expandedMesocycleId.update((current) => (current === mesocycleId ? null : mesocycleId));
  }

  protected setPhase(mesocycle: Mesocycle, phase: string): void {
    this.patchMesocycle(mesocycle, { phase: phase as MesocyclePhase });
  }

  protected setMesocycleLoad(mesocycle: Mesocycle, load: string): void {
    this.patchMesocycle(mesocycle, { load: load as TrainingLoad });
  }

  protected setMesocycleGoal(mesocycle: Mesocycle, goal: string): void {
    this.patchMesocycle(mesocycle, { goal });
  }

  private patchMesocycle(mesocycle: Mesocycle, patch: Partial<Mesocycle>): void {
    const macrocycle = this.selected();
    if (!macrocycle) return;
    this.atletaService.updateMesocycle(this.athleteId(), macrocycle.id, mesocycle.id, patch);
  }

  protected setDayLoad(mesocycle: Mesocycle, day: MicrocycleDay, load: string): void {
    const nextLoad = load as TrainingLoad;
    // Un día de descanso no tiene contenido a trabajar.
    this.patchDay(mesocycle, day, {
      load: nextLoad,
      workType: nextLoad === 'descanso' ? null : (day.workType ?? 'tecnica'),
    });
  }

  protected setDayWorkType(mesocycle: Mesocycle, day: MicrocycleDay, workType: string): void {
    this.patchDay(mesocycle, day, { workType: workType ? (workType as WorkType) : null });
  }

  protected setDayGoal(mesocycle: Mesocycle, day: MicrocycleDay, goal: string): void {
    this.patchDay(mesocycle, day, { goal });
  }

  private patchDay(
    mesocycle: Mesocycle,
    day: MicrocycleDay,
    patch: Partial<Omit<MicrocycleDay, 'weekday'>>,
  ): void {
    const macrocycle = this.selected();
    if (!macrocycle) return;
    this.atletaService.updateMicrocycleDay(
      this.athleteId(),
      macrocycle.id,
      mesocycle.id,
      day.weekday,
      patch,
    );
  }

  // ------------------------------------------------------------------
  // Etiquetas
  // ------------------------------------------------------------------

  protected phaseBarClasses(phase: MesocyclePhase): string {
    return MESOCYCLE_PHASE_BAR_CLASSES[phase];
  }

  protected weeksOf(mesocycle: Mesocycle): number {
    return weeksBetween(mesocycle.startDate, mesocycle.endDate);
  }

  protected rangeLabel(from: Date, to: Date): string {
    const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt.format(from)} – ${fmt.format(to)}`;
  }

  protected fullDateLabel(date: Date): string {
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        date,
      ),
    );
  }

  /** Semanas totales del macrociclo, para el resumen de la cabecera. */
  protected totalWeeks(macrocycle: Macrocycle): number {
    return weeksBetween(macrocycle.startDate, macrocycle.endDate);
  }

  protected weekdayShort(weekday: MicrocycleDay['weekday']): string {
    return WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.short ?? '';
  }
}
