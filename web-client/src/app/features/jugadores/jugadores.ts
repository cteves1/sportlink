import { AfterViewInit, Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {
  LucideCheck,
  LucideChevronDown,
  LucideChevronUp,
  LucideClipboardList,
  LucideMessageCircle,
  LucidePencil,
  LucideRotateCcw,
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
type TabMode = 'activos' | 'eliminados';

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
    LucideRotateCcw,
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

  protected readonly tabMode = signal<TabMode>('activos');
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

  protected readonly dataSource = new MatTableDataSource<Athlete>([]);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /** Renderiza una fila de detalle por cada fila de datos para permitir la expansión. */
  protected readonly isExpansionDetailRow = (): boolean => true;

  protected readonly filteredAthletes = computed(() => {
    const athletes = this.playersService.athletes();
    const tab = this.tabMode();
    const category = this.selectedCategory();
    const status = this.statusFilter();
    const term = this.searchTerm().trim().toLowerCase();

    return athletes.filter((athlete) => {
      const inTab = tab === 'activos' ? !athlete.deletedAt : !!athlete.deletedAt;
      if (!inTab) return false;
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

  protected readonly resultsCount = computed(() => this.filteredAthletes().length);
  protected readonly totalCount = computed(() => this.playersService.athletes().filter((a) => !a.deletedAt).length);
  protected readonly deletedCount = computed(
    () => this.playersService.athletes().filter((a) => !!a.deletedAt).length,
  );

  protected readonly editingAthlete = computed(() => {
    const id = this.editingAthleteId();
    if (id === null) return null;
    return this.playersService.athletes().find((athlete) => athlete.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredAthletes();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  protected applySearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected selectCategory(category: CategoryFilter): void {
    this.selectedCategory.set(category);
  }

  protected selectStatus(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  protected setTab(mode: TabMode): void {
    this.tabMode.set(mode);
    this.expandedId.set(null);
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

  protected async restoreAthlete(athleteId: number): Promise<void> {
    await this.playersService.restoreAthlete(athleteId);
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

  protected levelLabel(athlete: Athlete): string {
    return this.levelLabels[athlete.level];
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
