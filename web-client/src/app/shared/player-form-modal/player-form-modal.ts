import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideMessageCircle, LucideX } from '@lucide/angular';
import { Athlete, Category, PlayersService } from '../../core/players/players.service';
import { sendWhatsapp } from '../../core/players/whatsapp';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  birthDate: '',
  // El valor viaja como string porque las <option> del select emiten strings.
  category: '8',
  phone: '',
  playerType: 'regular' as Athlete['playerType'],
  dominantHand: 'derecha' as Athlete['dominantHand'],
  paddleGrip: 'clasica' as Athlete['paddleGrip'],
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

  /** Categorías disponibles en el select, de élite (1) a novato (8). */
  protected readonly categories: Category[] = [1, 2, 3, 4, 5, 6, 7, 8];

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
    paddleGrip: ['clasica' as Athlete['paddleGrip'], Validators.required],
  });

  constructor() {
    // Precarga el formulario con los datos del jugador en modo edición (sin regenerar usuario/clave).
    effect(() => {
      const athlete = this.athlete();
      this.lastCreated.set(null);
      this.form.reset(
        athlete === null
          ? EMPTY_FORM
          : {
              firstName: athlete.firstName,
              lastName: athlete.lastName,
              birthDate: this.toDateInputValue(athlete.birthDate),
              category: String(athlete.category),
              phone: athlete.phone,
              playerType: athlete.playerType,
              dominantHand: athlete.dominantHand,
              paddleGrip: athlete.paddleGrip,
            },
      );
    });
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
      paddleGrip: value.paddleGrip,
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

  /** Formatea una fecha a 'yyyy-MM-dd' para precargar un <input type="date">. */
  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
