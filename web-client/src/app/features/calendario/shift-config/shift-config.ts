import { Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideClock, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';
import {
  Athlete,
  PlayersService,
  WEEKDAY_OPTIONS,
  Weekday,
  categoryBadgeClasses,
  categoryLabel,
} from '../../../core/players/players.service';
import { CalendarService, ShiftTemplateInput } from '../calendar.service';
import { ShiftTemplate } from '../calendar.models';

/** Nombre del control booleano que representa cada día de la jornada. */
function dayControlName(weekday: Weekday): string {
  return `dia${weekday}`;
}

const EMPTY_FORM = {
  label: '',
  startTime: '09:00',
  endTime: '13:00',
  unlimited: true,
  capacity: 6,
  weekdays: {
    dia1: false,
    dia2: false,
    dia3: false,
    dia4: false,
    dia5: false,
    dia6: false,
    dia7: false,
  },
};

/**
 * Configuración del calendario del entrenador: define la jornada (días de la semana),
 * el turno (hora de inicio y fin), un tope opcional de jugadores y los jugadores fijos
 * que quedan anotados en cada sesión generada.
 */
@Component({
  selector: 'app-shift-config',
  standalone: true,
  imports: [ReactiveFormsModule, LucideClock, LucidePencil, LucidePlus, LucideTrash2, LucideX],
  templateUrl: './shift-config.html',
})
export class ShiftConfig {
  private readonly fb = inject(FormBuilder);
  private readonly calendarService = inject(CalendarService);
  private readonly playersService = inject(PlayersService);

  readonly closed = output<void>();

  protected readonly weekdays = WEEKDAY_OPTIONS;
  protected readonly dayControlName = dayControlName;
  protected readonly categoryLabel = categoryLabel;
  protected readonly categoryBadgeClasses = categoryBadgeClasses;

  protected readonly templates = this.calendarService.templates;

  /** Solo se ofrecen los jugadores activos de la base real. */
  protected readonly availablePlayers = computed<Athlete[]>(() =>
    this.playersService.athletes().filter((athlete) => athlete.status === 'activo'),
  );

  /** Turno que se está editando; `null` = se está creando uno nuevo. */
  protected readonly editingId = signal<number | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly selectedPlayerIds = signal<number[]>([]);
  protected readonly error = signal<string | null>(null);
  /** Id del turno cuya eliminación está pidiendo confirmación. */
  protected readonly confirmingDeleteId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    label: ['', Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: ['13:00', Validators.required],
    unlimited: [true],
    capacity: [6, [Validators.min(1)]],
    weekdays: this.fb.nonNullable.group({
      dia1: [false],
      dia2: [false],
      dia3: [false],
      dia4: [false],
      dia5: [false],
      dia6: [false],
      dia7: [false],
    }),
  });

  /** "Sin límite" como signal, para mostrar u ocultar el campo de cupos máximos. */
  protected readonly unlimited = toSignal(this.form.controls.unlimited.valueChanges, {
    initialValue: this.form.controls.unlimited.value,
  });

  protected close(): void {
    this.closed.emit();
  }

  protected openNewShift(): void {
    this.editingId.set(null);
    this.selectedPlayerIds.set([]);
    this.error.set(null);
    this.form.reset(EMPTY_FORM);
    this.formOpen.set(true);
  }

  protected editShift(template: ShiftTemplate): void {
    this.editingId.set(template.id);
    this.selectedPlayerIds.set([...template.playerIds]);
    this.error.set(null);
    this.form.reset({
      label: template.label,
      startTime: template.startTime,
      endTime: template.endTime,
      unlimited: template.capacity === null,
      capacity: template.capacity ?? EMPTY_FORM.capacity,
      weekdays: WEEKDAY_OPTIONS.reduce(
        (group, option) => ({
          ...group,
          [dayControlName(option.value)]: template.weekdays.includes(option.value),
        }),
        {} as typeof EMPTY_FORM.weekdays,
      ),
    });
    this.formOpen.set(true);
  }

  protected cancelForm(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  protected togglePlayer(playerId: number): void {
    this.selectedPlayerIds.update((ids) =>
      ids.includes(playerId) ? ids.filter((id) => id !== playerId) : [...ids, playerId],
    );
  }

  protected isPlayerSelected(playerId: number): boolean {
    return this.selectedPlayerIds().includes(playerId);
  }

  /** Marca o desmarca todos los jugadores disponibles de una vez. */
  protected toggleAllPlayers(): void {
    const all = this.availablePlayers().map((athlete) => athlete.id);
    this.selectedPlayerIds.set(this.selectedPlayerIds().length === all.length ? [] : all);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const weekdays = WEEKDAY_OPTIONS.filter(
      (option) => value.weekdays[dayControlName(option.value) as keyof typeof value.weekdays],
    ).map((option) => option.value);

    if (weekdays.length === 0) {
      this.error.set('Elige al menos un día de la jornada.');
      return;
    }
    if (value.endTime <= value.startTime) {
      this.error.set('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    const input: ShiftTemplateInput = {
      label: value.label.trim(),
      startTime: value.startTime,
      endTime: value.endTime,
      weekdays,
      capacity: value.unlimited ? null : Number(value.capacity),
      playerIds: [...this.selectedPlayerIds()],
    };

    const editingId = this.editingId();
    if (editingId !== null) {
      this.calendarService.updateTemplate(editingId, input);
    } else {
      this.calendarService.addTemplate(input);
    }

    this.formOpen.set(false);
    this.error.set(null);
  }

  protected requestDelete(templateId: number): void {
    this.confirmingDeleteId.set(templateId);
  }

  protected dismissDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected confirmDelete(templateId: number): void {
    this.calendarService.deleteTemplate(templateId);
    this.confirmingDeleteId.set(null);
    if (this.editingId() === templateId) this.formOpen.set(false);
  }

  /** Jornada legible de un turno ("Lun · Mar · Mié"). */
  protected weekdaysLabel(template: ShiftTemplate): string {
    return WEEKDAY_OPTIONS.filter((option) => template.weekdays.includes(option.value))
      .map((option) => option.short)
      .join(' · ');
  }

  protected capacityLabel(template: ShiftTemplate): string {
    return template.capacity === null ? 'Sin límite' : `Hasta ${template.capacity} jugadores`;
  }

  /** Nombres de los jugadores fijos de un turno, para el resumen de la tarjeta. */
  protected playersLabel(template: ShiftTemplate): string {
    const athletes = this.playersService.athletes();
    const names = template.playerIds
      .map((playerId) => athletes.find((athlete) => athlete.id === playerId))
      .filter((athlete): athlete is Athlete => athlete !== undefined)
      .map((athlete) => `${athlete.firstName} ${athlete.lastName}`);
    return names.length === 0 ? 'Sin jugadores asignados' : names.join(', ');
  }
}
