import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucideClipboardList,
  LucideMessageCircle,
  LucidePencil,
  LucideTrash2,
  LucideUserPlus,
} from '@lucide/angular';
import {
  Athlete,
  CATEGORY_OPTIONS,
  Category,
  PlayersService,
  WelcomeFormAnswers,
  categoryBadgeClasses,
  categoryLabel,
  isEliteCategory,
  paddleGripLabel,
  playingStyleLabel,
  PLAYER_LEVEL_LABELS,
  rubberTypeLabel,
  trainingDaysLabel,
} from '../../core/players/players.service';
import { buildWhatsappLink, sendWhatsapp } from '../../core/players/whatsapp';
import { PlayerFormModal } from '../../shared/player-form-modal/player-form-modal';
import { SubscriptionModal } from '../../shared/subscription-modal/subscription-modal';

export type { Athlete, Category };

type StatusFilter = 'todos' | 'activo' | 'inactivo';
type CategoryFilter = 'todas' | Category;

interface SortState {
  active: string;
  direction: 'asc' | 'desc' | '';
}

interface PageState {
  pageIndex: number;
  pageSize: number;
}

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    PlayerFormModal,
    SubscriptionModal,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    LucideUserPlus,
    LucideChevronDown,
    LucideChevronUp,
    LucideClipboardList,
    LucideMessageCircle,
    LucidePencil,
    LucideTrash2,
  ],
  templateUrl: './jugadores.html',
})
export class Jugadores {
  private readonly playersService = inject(PlayersService);

  /** Categorías disponibles para filtrar, incluyendo la opción "Todas". */
  protected readonly categories: CategoryFilter[] = ['todas', ...CATEGORY_OPTIONS];
  protected readonly statusFilters: StatusFilter[] = ['todos', 'activo', 'inactivo'];

  protected readonly categoryLabel = categoryLabel;
  protected readonly categoryBadgeClasses = categoryBadgeClasses;
  protected readonly levelLabels = PLAYER_LEVEL_LABELS;
  protected readonly paddleGripLabel = paddleGripLabel;
  protected readonly playingStyleLabel = playingStyleLabel;
  protected readonly rubberTypeLabel = rubberTypeLabel;
  protected readonly trainingDaysLabel = trainingDaysLabel;
  protected isElite(athlete: Athlete): boolean {
    return isEliteCategory(athlete.category);
  }
  protected readonly buildWhatsappLink = buildWhatsappLink;

  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal<CategoryFilter>('todas');
  protected readonly statusFilter = signal<StatusFilter>('todos');
  protected readonly expandedId = signal<number | null>(null);
  protected readonly isFormOpen = signal(false);
  protected readonly editingAthleteId = signal<number | null>(null);

  protected readonly displayedColumns = [
    'fullName',
    'category',
    'status',
    'playerType',
    'attendance',
    'subscription',
    'actions',
  ];

  protected readonly subscriptionAthlete = signal<Athlete | null>(null);

  protected readonly sortState = signal<SortState>({ active: '', direction: '' });
  protected readonly pageState = signal<PageState>({ pageIndex: 0, pageSize: 10 });

  protected readonly filteredAthletes = computed(() => {
    const athletes = this.playersService.athletes();
    const category = this.selectedCategory();
    const status = this.statusFilter();
    const term = this.searchTerm().trim().toLowerCase();

    return athletes.filter((athlete) => {
      if (category !== 'todas' && athlete.category !== category) return false;
      if (status !== 'todos' && athlete.status !== status) return false;
      if (term) {
        const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
        const matchesName = fullName.includes(term);
        const matchesUsername = athlete.username.toLowerCase().includes(term);
        const matchesPhone = athlete.phone.includes(term);
        if (!matchesName && !matchesUsername && !matchesPhone) return false;
      }
      return true;
    });
  });

  protected readonly sortedAthletes = computed(() => {
    const data = [...this.filteredAthletes()];
    const { active, direction } = this.sortState();
    if (!active || !direction) return data;

    const sortValue = (athlete: Athlete): string | number => {
      switch (active) {
        case 'fullName':
          return `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
        case 'category':
          return athlete.category;
        case 'status':
          return athlete.status;
        case 'attendance':
          return athlete.attendance;
        default:
          return '';
      }
    };

    return data.sort((a, b) => {
      const valueA = sortValue(a);
      const valueB = sortValue(b);
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  protected readonly paginatedAthletes = computed(() => {
    const { pageIndex, pageSize } = this.pageState();
    const start = pageIndex * pageSize;
    return this.sortedAthletes().slice(start, start + pageSize);
  });

  protected readonly resultsCount = computed(() => this.filteredAthletes().length);

  protected readonly editingAthlete = computed(() => {
    const id = this.editingAthleteId();
    if (id === null) return null;
    return this.playersService.athletes().find((athlete) => athlete.id === id) ?? null;
  });

  protected applySearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.pageState.update((state) => ({ ...state, pageIndex: 0 }));
  }

  protected selectCategory(category: CategoryFilter): void {
    this.selectedCategory.set(category);
    this.pageState.update((state) => ({ ...state, pageIndex: 0 }));
  }

  protected selectStatus(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.pageState.update((state) => ({ ...state, pageIndex: 0 }));
  }

  protected onSort(active: string): void {
    this.sortState.update((state) => {
      const nextDirection: SortState['direction'] =
        state.active === active ? (state.direction === 'asc' ? 'desc' : state.direction === 'desc' ? '' : 'asc') : 'asc';
      return { active: nextDirection ? active : '', direction: nextDirection };
    });
  }

  protected onPage(event: PageEvent): void {
    this.pageState.set({ pageIndex: event.pageIndex, pageSize: event.pageSize });
  }

  protected toggleExpand(athleteId: number): void {
    this.expandedId.update((current) => (current === athleteId ? null : athleteId));
  }

  protected openForm(): void {
    this.editingAthleteId.set(null);
    this.isFormOpen.set(true);
  }

  protected openEditForm(athlete: Athlete): void {
    this.editingAthleteId.set(athlete.id);
    this.isFormOpen.set(true);
  }

  protected closeForm(): void {
    this.isFormOpen.set(false);
    this.editingAthleteId.set(null);
  }

  protected async toggleStatus(athleteId: number): Promise<void> {
    await this.playersService.toggleStatus(athleteId);
  }

  protected async deleteAthlete(athleteId: number): Promise<void> {
    await this.playersService.deleteAthlete(athleteId);
  }

  protected openSubscription(athlete: Athlete): void {
    this.subscriptionAthlete.set(athlete);
  }

  protected closeSubscription(): void {
    this.subscriptionAthlete.set(null);
  }

  protected sendWhatsapp(athlete: Athlete): void {
    sendWhatsapp(athlete);
  }

  protected formatBirthDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  protected levelLabel(athlete: Athlete): string {
    return this.levelLabels[athlete.level];
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
