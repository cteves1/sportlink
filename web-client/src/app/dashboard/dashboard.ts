import { Component, computed, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { AuthService } from '../auth/auth.service';
import { DashboardService } from './services/dashboard.service';
import { DashboardData, Objective, Player } from './models/dashboard.model';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  trend: string;
  trendPositive: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    ButtonModule,
    ChartModule,
    CardModule,
    ProgressBarModule,
    TableModule,
    TagModule,
    TimelineModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly user = this.authService.user;
  readonly isCoach = this.authService.isCoach;

  readonly dashboardData = signal<DashboardData | null>(null);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly players = signal<Player[]>([]);
  readonly isPlayersLoading = signal(false);

  constructor() {
    effect(() => this.loadDashboardData());
    effect(() => this.loadPlayers());
  }

  private loadDashboardData(): () => void {
    const role = this.user()?.role;
    if (!role) {
      return () => {};
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    const sub = this.dashboardService.getDashboardData(role).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });

    return () => sub.unsubscribe();
  }

  retry(): void {
    this.loadDashboardData();
  }

  private loadPlayers(): () => void {
    if (!this.isCoach()) {
      this.players.set([]);
      this.isPlayersLoading.set(false);
      return () => {};
    }

    this.isPlayersLoading.set(true);

    const sub = this.dashboardService.getPlayers().subscribe({
      next: (players) => {
        this.players.set(players);
        this.isPlayersLoading.set(false);
      },
      error: () => {
        this.isPlayersLoading.set(false);
      },
    });

    return () => sub.unsubscribe();
  }

  readonly greeting = computed(() => {
    const name = this.user()?.name ?? 'Jugador';
    const hour = new Date().getHours();
    if (hour < 12) return `Buenos días, ${name}`;
    if (hour < 20) return `Buenas tardes, ${name}`;
    return `Buenas noches, ${name}`;
  });

  readonly roleLabel = computed(() =>
    this.user()?.role === 'coach' ? 'Entrenador' : 'Jugador',
  );

  readonly currentDate = computed(() =>
    new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  );

  readonly nextTraining = computed(() => this.dashboardData()?.nextTraining ?? null);
  readonly objectives = computed(() => this.dashboardData()?.objectives ?? []);
  readonly upcomingEvents = computed(() => this.dashboardData()?.upcomingEvents ?? []);
  readonly notes = computed(() => this.dashboardData()?.notes ?? []);
  readonly recentActivity = computed(() => this.dashboardData()?.recentActivity ?? []);

  readonly visibleObjectives = computed(() => this.objectives().slice(0, 3));
  readonly hasMoreObjectives = computed(() => this.objectives().length > 3);

  readonly statCards: StatCard[] = [
    { label: 'Partidos jugados', value: '42', icon: 'pi pi-trophy', trend: '+5 esta semana', trendPositive: true },
    { label: 'Precisión promedio', value: '76%', icon: 'pi pi-bullseye', trend: '+3% vs. mes anterior', trendPositive: true },
    { label: 'Ranking actual', value: '#62', icon: 'pi pi-chart-line', trend: '-8 posiciones', trendPositive: true },
  ];



  readonly matchesChartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Sets ganados',
        data: [4, 6, 3, 8, 5, 9, 7],
        borderColor: '#14824b',
        backgroundColor: 'rgba(20, 130, 75, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  readonly matchesChartOptions = {
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true },
    },
  };

  readonly strokesChartData = {
    labels: ['Drive', 'Revés', 'Saque', 'Remate', 'Bloqueo'],
    datasets: [
      {
        label: 'Precisión (%)',
        data: [78, 65, 82, 54, 90],
        backgroundColor: ['#14824b', '#34c77b', '#0f5132', '#6fdc9c', '#0a3d26'],
        borderRadius: 6,
      },
    ],
  };

  readonly strokesChartOptions = {
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100 },
    },
  };

  readonly progressChartData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Ranking',
        data: [120, 110, 95, 88, 70, 62],
        borderColor: '#0f5132',
        backgroundColor: 'rgba(15, 81, 50, 0.15)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  readonly progressChartOptions = {
    plugins: { legend: { display: false } },
    scales: {
      y: { reverse: true, beginAtZero: false },
    },
  };

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatShortDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  formatLongDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      technique: 'Técnica',
      physical: 'Física',
      tactical: 'Táctica',
      mental: 'Mental',
      general: 'General',
    };
    return labels[category] ?? 'General';
  }

  getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      training: 'Entrenamiento',
      tournament: 'Torneo',
      match: 'Partido',
      evaluation: 'Evaluación',
    };
    return labels[type] ?? 'Evento';
  }

  getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      training: 'pi pi-chart-line',
      tournament: 'pi pi-trophy',
      match: 'pi pi-tablet',
      evaluation: 'pi pi-check-circle',
    };
    return icons[type] ?? 'pi pi-calendar';
  }

  getNoteTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      technical: 'Técnica',
      tactical: 'Táctica',
      physical: 'Física',
      general: 'General',
    };
    return labels[type] ?? 'General';
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
      scheduled: 'info',
      in_progress: 'warn',
      completed: 'success',
      cancelled: 'danger',
      active: 'success',
      pending_review: 'warn',
    };
    return severities[status];
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Programado',
      in_progress: 'En curso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      active: 'Activo',
      pending_review: 'Pendiente de revisión',
    };
    return labels[status] ?? status;
  }

  summarize(content: string, maxLength = 80): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + '…';
  }

  getPlayerCategoryLabel(category: Player['category']): string {
    const labels: Record<Player['category'], string> = {
      benjamin: 'Benjamín',
      alevin: 'Alevín',
      infantil: 'Infantil',
      cadete: 'Cadete',
      juvenil: 'Juvenil',
      senior: 'Senior',
    };
    return labels[category];
  }

  getHandLabel(hand: Player['hand']): string {
    return hand === 'right' ? 'Diestro' : 'Zurdo';
  }

  getPlayerLevelLabel(level: Player['level']): string {
    const labels: Record<Player['level'], string> = {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
    };
    return labels[level];
  }

  getPlayerStatusSeverity(status: Player['status']): 'success' | 'info' | 'warn' | 'danger' | undefined {
    const severities: Record<Player['status'], 'success' | 'info' | 'warn' | 'danger'> = {
      active: 'success',
      injured: 'warn',
      inactive: 'info',
    };
    return severities[status];
  }

  getPlayerStatusLabel(status: Player['status']): string {
    const labels: Record<Player['status'], string> = {
      active: 'Activo',
      injured: 'Lesionado',
      inactive: 'Inactivo',
    };
    return labels[status];
  }

}
