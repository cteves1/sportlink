import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucideClipboardList,
  LucideMessageCircle,
  LucidePencil,
  LucideSearch,
  LucideUserPlus,
} from '@lucide/angular';
import {
  Athlete,
  Category,
  PlayersService,
  WelcomeFormAnswers,
} from '../../core/players/players.service';
import { buildWhatsappLink, sendWhatsapp } from '../../core/players/whatsapp';
import { PlayerFormModal } from '../../shared/player-form-modal/player-form-modal';

export type { Athlete, Category };

type StatusFilter = 'todos' | 'activo' | 'inactivo';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [
    RouterLink,
    PlayerFormModal,
    LucideSearch,
    LucideUserPlus,
    LucideChevronDown,
    LucideChevronUp,
    LucideClipboardList,
    LucideMessageCircle,
    LucidePencil,
  ],
  templateUrl: './jugadores.html',
})
export class Jugadores {
  private readonly playersService = inject(PlayersService);

  /** Categorías disponibles para los chips de filtro, de élite (1) a novato (8). */
  protected readonly categories: Category[] = [1, 2, 3, 4, 5, 6, 7, 8];

  protected readonly athletes = this.playersService.athletes;

  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal<Category | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('todos');
  protected readonly expandedId = signal<number | null>(null);
  protected readonly isFormOpen = signal(false);
  protected readonly editingAthleteId = signal<number | null>(null);

  /** Jugador que el modal debe precargar; `null` significa alta de un jugador nuevo. */
  protected readonly editingAthlete = computed(() => {
    const id = this.editingAthleteId();
    if (id === null) return null;
    return this.athletes().find((athlete) => athlete.id === id) ?? null;
  });

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
    this.editingAthleteId.set(null);
    this.isFormOpen.set(true);
  }

  /** Abre el mismo modal precargado con los datos del jugador, para editarlo sin regenerar usuario/clave. */
  protected openEditForm(athlete: Athlete): void {
    this.editingAthleteId.set(athlete.id);
    this.isFormOpen.set(true);
  }

  protected closeForm(): void {
    this.isFormOpen.set(false);
    this.editingAthleteId.set(null);
  }

  protected buildWhatsappLink(athlete: Athlete): string {
    return buildWhatsappLink(athlete);
  }

  protected sendWhatsapp(athlete: Athlete): void {
    sendWhatsapp(athlete);
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
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private static readonly MAIN_GOAL_LABELS: Record<WelcomeFormAnswers['mainGoal'], string> = {
    competir: 'Competir',
    'mejorar-tecnica': 'Mejorar su técnica',
    socializar: 'Socializar / hacer amigos',
    'mantenerse-en-forma': 'Mantenerse en forma',
    otro: 'Otro',
  };

  private static readonly YEARS_PLAYING_LABELS: Record<WelcomeFormAnswers['yearsPlaying'], string> =
    {
      'menos-de-1': 'Menos de 1 año',
      '1-a-3': 'Entre 1 y 3 años',
      '3-a-5': 'Entre 3 y 5 años',
      'mas-de-5': 'Más de 5 años',
    };

  private static readonly SELF_LEVEL_LABELS: Record<
    WelcomeFormAnswers['selfPerceivedLevel'],
    string
  > = {
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
