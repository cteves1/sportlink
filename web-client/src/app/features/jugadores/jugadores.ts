import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucideClipboardList,
  LucideMessageCircle,
  LucideSearch,
  LucideUserPlus,
  LucideX,
} from '@lucide/angular';
import { Athlete, Category, PlayersService, WelcomeFormAnswers } from '../../core/players/players.service';

export type { Athlete, Category };

type StatusFilter = 'todos' | 'activo' | 'inactivo';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideSearch,
    LucideUserPlus,
    LucideX,
    LucideChevronDown,
    LucideChevronUp,
    LucideClipboardList,
    LucideMessageCircle,
  ],
  templateUrl: './jugadores.html',
})
export class Jugadores {
  private readonly fb = inject(FormBuilder);
  private readonly playersService = inject(PlayersService);

  /** Categorías disponibles para los chips de filtro y el select del formulario, de élite (1) a novato (8). */
  protected readonly categories: Category[] = [1, 2, 3, 4, 5, 6, 7, 8];

  protected readonly athletes = this.playersService.athletes;

  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal<Category | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('todos');
  protected readonly expandedId = signal<number | null>(null);
  protected readonly isFormOpen = signal(false);
  protected readonly lastCreated = signal<Athlete | null>(null);

  protected readonly filteredAthletes = computed(() => {
    const category = this.selectedCategory();
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.athletes().filter((athlete) => {
      const matchesCategory = category === null || athlete.category === category;
      const matchesStatus = status === 'todos' || athlete.status === status;
      const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
      const matchesSearch = term === '' || fullName.includes(term);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  });

  protected readonly resultsCount = computed(() => this.filteredAthletes().length);
  protected readonly totalCount = computed(() => this.athletes().length);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    birthDate: ['', Validators.required],
    category: [8, Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s-]{8,}$/)]],
    playerType: ['regular' as Athlete['playerType'], Validators.required],
    dominantHand: ['derecha' as Athlete['dominantHand'], Validators.required],
    paddleGrip: ['clasica' as Athlete['paddleGrip'], Validators.required],
  });

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected selectCategory(category: Category | null): void {
    this.selectedCategory.set(category);
  }

  protected selectStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  protected toggleExpand(athleteId: number): void {
    this.expandedId.update((current) => (current === athleteId ? null : athleteId));
  }

  protected toggleStatus(athleteId: number): void {
    this.playersService.toggleStatus(athleteId);
  }

  protected openForm(): void {
    this.lastCreated.set(null);
    this.isFormOpen.set(true);
  }

  protected closeForm(): void {
    this.isFormOpen.set(false);
    this.lastCreated.set(null);
    this.form.reset({
      firstName: '',
      lastName: '',
      birthDate: '',
      category: 8,
      phone: '',
      playerType: 'regular',
      dominantHand: 'derecha',
      paddleGrip: 'clasica',
    });
  }

  protected submitPlayer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const newAthlete = this.playersService.addAthlete({
      firstName: value.firstName,
      lastName: value.lastName,
      category: value.category as Category,
      phone: value.phone,
      playerType: value.playerType,
      birthDate: new Date(value.birthDate),
      dominantHand: value.dominantHand,
      paddleGrip: value.paddleGrip,
    });

    this.lastCreated.set(newAthlete);
    this.form.reset({
      firstName: '',
      lastName: '',
      birthDate: '',
      category: 8,
      phone: '',
      playerType: 'regular',
      dominantHand: 'derecha',
      paddleGrip: 'clasica',
    });
  }

  /**
   * Construye el enlace de WhatsApp Web API (https://wa.me/{telefono}?text={mensaje}).
   * 1) El teléfono se limpia a solo dígitos (wa.me no acepta espacios/guiones/"+").
   * 2) El mensaje se arma con los datos del jugador y se codifica con encodeURIComponent
   *    para que espacios, tildes y símbolos viajen correctamente en la URL.
   */
  protected buildWhatsappLink(athlete: Athlete): string {
    const digitsOnly = athlete.phone.replace(/[^0-9]/g, '');
    const message =
      `¡Hola ${athlete.firstName}! El entrenador te ha dado de alta en la app de Tenis de Mesa. ` +
      `Tu usuario es: ${athlete.username} y tu clave temporal es: ${athlete.tempPassword}. ` +
      `Ingresa en: https://tt-trainer.app para gestionar tus asistencias.`;

    return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
  }

  protected sendWhatsapp(athlete: Athlete): void {
    window.open(this.buildWhatsappLink(athlete), '_blank', 'noopener');
  }

  /** Los atletas de categoría 1 tienen ficha de seguimiento de alto rendimiento. */
  protected isElite(athlete: Athlete): boolean {
    return athlete.category === 1;
  }

  /** Clases del badge de categoría: cat 1 destaca como nivel élite, 2-3 azul, 4-5 verde, 6-8 gris (novato). */
  protected categoryBadgeClasses(category: Category): string {
    if (category === 1) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-300';
    if (category <= 3) return 'bg-blue-100 text-blue-700';
    if (category <= 5) return 'bg-brand-100 text-brand-700';
    return 'bg-gray-100 text-gray-600';
  }

  protected formatBirthDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  private static readonly MAIN_GOAL_LABELS: Record<WelcomeFormAnswers['mainGoal'], string> = {
    competir: 'Competir',
    'mejorar-tecnica': 'Mejorar su técnica',
    socializar: 'Socializar / hacer amigos',
    'mantenerse-en-forma': 'Mantenerse en forma',
    otro: 'Otro',
  };

  private static readonly YEARS_PLAYING_LABELS: Record<WelcomeFormAnswers['yearsPlaying'], string> = {
    'menos-de-1': 'Menos de 1 año',
    '1-a-3': 'Entre 1 y 3 años',
    '3-a-5': 'Entre 3 y 5 años',
    'mas-de-5': 'Más de 5 años',
  };

  private static readonly SELF_LEVEL_LABELS: Record<WelcomeFormAnswers['selfPerceivedLevel'], string> = {
    principiante: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
  };

  protected mainGoalLabel(goal: WelcomeFormAnswers['mainGoal']): string {
    return Jugadores.MAIN_GOAL_LABELS[goal];
  }

  protected yearsPlayingLabel(years: WelcomeFormAnswers['yearsPlaying']): string {
    return Jugadores.YEARS_PLAYING_LABELS[years];
  }

  protected selfLevelLabel(level: WelcomeFormAnswers['selfPerceivedLevel']): string {
    return Jugadores.SELF_LEVEL_LABELS[level];
  }
}
