import { AfterViewInit, Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import {
  LucideCheck,
  LucideChevronDown,
  LucideChevronUp,
  LucideClipboardList,
  LucideMessageCircle,
  LucidePencil,
  LucideTrash2,
  LucideUserPlus,
  LucideX,
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
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    LucideUserPlus,
    LucideCheck,
    LucideChevronDown,
    LucideChevronUp,
    LucideClipboardList,
    LucideMessageCircle,
    LucidePencil,
    LucideTrash2,
    LucideX,
  ],
  templateUrl: './jugadores.html',
})
export class Jugadores implements AfterViewInit {
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
  protected readonly isElite = isEliteCategory;
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
    'paid',
    'debt',
    'actions',
  ];

  protected readonly sortState = signal<SortState>({ active: '', direction: '' });
  protected readonly pageState = signal<PageState>({ pageIndex: 0, pageSize: 10 });

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /** Renderiza una fila de detalle por cada fila de datos para permitir la expansión. */
  protected readonly isExpansionDetailRow = (): boolean => true;

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
        case 'debt':
          return athlete.debt;
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

  ngAfterViewInit(): void {
    // Sincroniza el estado interno con los componentes de Material en caso de cambios por UX.
    if (this.sort) {
      this.sortState.set({
        active: this.sort.active,
        direction: this.sort.direction as SortState['direction'],
      });
    }
  }

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

  protected onSort(sort: Sort): void {
    this.sortState.set({ active: sort.active, direction: sort.direction as SortState['direction'] });
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

  protected async togglePaid(athleteId: number): Promise<void> {
    await this.playersService.togglePaid(athleteId);
  }

  protected async updateDebt(athleteId: number, value: number): Promise<void> {
    const debt = Number.isFinite(value) && value >= 0 ? value : 0;
    await this.playersService.updateDebt(athleteId, debt);
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
