import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideMessageCircle, LucideX } from '@lucide/angular';
import {
  Athlete,
  CATEGORY_OPTIONS,
  Category,
  PaddleGrip,
  PlayerLevel,
  PlayersService,
  PlayingStyle,
  RubberType,
  WEEKDAY_OPTIONS,
  Weekday,
  categoryLabel,
} from '../../core/players/players.service';
import { sendWhatsapp } from '../../core/players/whatsapp';

/** Nombre del control booleano que representa cada día en el grupo `trainingDays`. */
function dayControlName(weekday: Weekday): string {
  return `dia${weekday}`;
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  birthDate: '',
  // El valor viaja como string porque las <option> del select emiten strings.
  category: '8',
  phone: '',
  playerType: 'regular' as Athlete['playerType'],
  dominantHand: 'derecha' as Athlete['dominantHand'],
  level: 'principiante' as PlayerLevel,
  paddleGrip: 'clasica' as PaddleGrip,
  rubberForehand: 'liso' as RubberType,
  rubberBackhand: 'liso' as RubberType,
  playingStyle: 'all-round' as PlayingStyle,
  club: '',
  specificGoal: '',
  trainingDays: {
    dia1: false,
    dia2: false,
    dia3: false,
    dia4: false,
    dia5: false,
    dia6: false,
    dia7: false,
  },
};

/** Modal de alta/edición de jugador, reutilizable desde Jugadores y desde las Acciones Rápidas del Home. */
@Component({
  selector: 'app-player-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideX, LucideMessageCircle],
  templateUrl: './player-form-modal.html',
})
export class PlayerFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly playersService = inject(PlayersService);

  /** Jugador a editar; `null` significa alta de un jugador nuevo. */
  readonly athlete = input<Athlete | null>(null);

  readonly closed = output<void>();
  readonly saved = output<Athlete>();

  /** Categorías disponibles en el select, de Atleta Elite a Infantil. */
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly weekdays = WEEKDAY_OPTIONS;
  protected readonly categoryLabel = categoryLabel;
  protected readonly dayControlName = dayControlName;

  protected readonly lastCreated = signal<Athlete | null>(null);
  protected readonly isEditing = computed(() => this.athlete() !== null);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    birthDate: ['', Validators.required],
    category: ['8', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s-]{8,}$/)]],
    playerType: ['regular' as Athlete['playerType'], Validators.required],
    dominantHand: ['derecha' as Athlete['dominantHand'], Validators.required],
    level: ['principiante' as PlayerLevel, Validators.required],
    // Desde nivel intermedio.
    paddleGrip: ['clasica' as PaddleGrip, Validators.required],
    rubberForehand: ['liso' as RubberType, Validators.required],
    rubberBackhand: ['liso' as RubberType, Validators.required],
    playingStyle: ['all-round' as PlayingStyle, Validators.required],
    // Solo nivel avanzado.
    club: ['', Validators.required],
    specificGoal: ['', Validators.required],
    // Días acordados con el entrenador: un booleano por día de la semana.
    trainingDays: this.fb.nonNullable.group({
      dia1: [false],
      dia2: [false],
      dia3: [false],
      dia4: [false],
      dia5: [false],
      dia6: [false],
      dia7: [false],
    }),
  });

  /** Nivel seleccionado, como signal, para condicionar la plantilla. */
  private readonly level = toSignal(this.form.controls.level.valueChanges, {
    initialValue: this.form.controls.level.value,
  });

  /** Desde intermedio se piden paleta, gomas y estilo de juego. */
  protected readonly showIntermediateFields = computed(() => this.level() !== 'principiante');
  /** Solo los avanzados declaran club y objetivo concreto. */
  protected readonly showAdvancedFields = computed(() => this.level() === 'avanzado');

  constructor() {
    // Precarga el formulario con los datos del jugador en modo edición (sin regenerar usuario/clave).
    effect(() => {
      const athlete = this.athlete();
      this.lastCreated.set(null);
      this.form.reset(athlete === null ? EMPTY_FORM : this.formValueOf(athlete));
    });

    // Los campos que no aplican al nivel se deshabilitan para que no bloqueen la validación.
    effect(() => {
      const intermediate = this.showIntermediateFields();
      const advanced = this.showAdvancedFields();
      const controls = this.form.controls;
      this.setEnabled(controls.paddleGrip, intermediate);
      this.setEnabled(controls.rubberForehand, intermediate);
      this.setEnabled(controls.rubberBackhand, intermediate);
      this.setEnabled(controls.playingStyle, intermediate);
      this.setEnabled(controls.club, advanced);
      this.setEnabled(controls.specificGoal, advanced);
    });
  }

  /** Habilita o deshabilita un control sin disparar `valueChanges` (evita bucles con el effect). */
  private setEnabled(control: AbstractControl, enabled: boolean): void {
    if (enabled) {
      control.enable({ emitEvent: false });
    } else {
      control.disable({ emitEvent: false });
    }
  }

  protected close(): void {
    this.lastCreated.set(null);
    this.form.reset(EMPTY_FORM);
    this.closed.emit();
  }

  /** Evita que Enter dispare el envío del formulario: solo se guarda con clic explícito en "Guardar". */
  protected blockEnterSubmit(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'BUTTON') {
      event.preventDefault();
    }
  }

  protected submitPlayer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      firstName: value.firstName,
      lastName: value.lastName,
      category: Number(value.category) as Category,
      phone: value.phone,
      playerType: value.playerType,
      birthDate: new Date(value.birthDate),
      dominantHand: value.dominantHand,
      level: value.level,
      // El servicio recorta a `null` lo que no corresponda al nivel declarado.
      paddleGrip: value.paddleGrip,
      rubberForehand: value.rubberForehand,
      rubberBackhand: value.rubberBackhand,
      playingStyle: value.playingStyle,
      club: value.club.trim() || null,
      specificGoal: value.specificGoal.trim() || null,
      trainingDays: this.selectedTrainingDays(value.trainingDays),
    };

    const editing = this.athlete();
    if (editing !== null) {
      this.playersService.updateAthlete(editing.id, payload);
      this.close();
      return;
    }

    const newAthlete = this.playersService.addAthlete(payload);
    this.lastCreated.set(newAthlete);
    this.saved.emit(newAthlete);
    this.form.reset(EMPTY_FORM);
  }

  protected sendWhatsapp(athlete: Athlete): void {
    sendWhatsapp(athlete);
  }

  /** Traduce el grupo de checkboxes a la lista ordenada de días acordados. */
  private selectedTrainingDays(group: Record<string, boolean>): Weekday[] {
    return WEEKDAY_OPTIONS.filter((option) => group[dayControlName(option.value)]).map(
      (option) => option.value,
    );
  }

  /** Arma el valor del formulario a partir de un atleta existente. */
  private formValueOf(athlete: Athlete): typeof EMPTY_FORM {
    return {
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      birthDate: this.toDateInputValue(athlete.birthDate),
      category: String(athlete.category),
      phone: athlete.phone,
      playerType: athlete.playerType,
      dominantHand: athlete.dominantHand,
      level: athlete.level,
      paddleGrip: athlete.paddleGrip ?? EMPTY_FORM.paddleGrip,
      rubberForehand: athlete.rubberForehand ?? EMPTY_FORM.rubberForehand,
      rubberBackhand: athlete.rubberBackhand ?? EMPTY_FORM.rubberBackhand,
      playingStyle: athlete.playingStyle ?? EMPTY_FORM.playingStyle,
      club: athlete.club ?? '',
      specificGoal: athlete.specificGoal ?? '',
      trainingDays: WEEKDAY_OPTIONS.reduce(
        (group, option) => ({
          ...group,
          [dayControlName(option.value)]: athlete.trainingDays.includes(option.value),
        }),
        {} as typeof EMPTY_FORM.trainingDays,
      ),
    };
  }

  /** Formatea una fecha a 'yyyy-MM-dd' para precargar un <input type="date">. */
  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
