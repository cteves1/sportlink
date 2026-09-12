import { Component, computed, inject, input, signal } from '@angular/core';
import { LucideChevronDown, LucideChevronUp, LucideMapPin, LucideTrophy } from '@lucide/angular';
import { capitalize } from '../../../core/date/calendar-dates';
import { Competition, CompetitionLevel } from '../atleta.models';
import { AtletaService } from '../atleta.service';

const LEVEL_LABELS: Record<CompetitionLevel, string> = {
  club: 'Club',
  regional: 'Regional',
  nacional: 'Nacional',
  internacional: 'Internacional',
};

/** Puestos ordenados de mejor a peor, para calcular el mejor resultado de la temporada. */
const PLACEMENT_RANK = [
  'Campeón',
  'Finalista',
  '3.º puesto',
  'Semifinal',
  'Cuartos de final',
  'Octavos de final',
];

@Component({
  selector: 'app-atleta-competencia',
  standalone: true,
  imports: [LucideChevronDown, LucideChevronUp, LucideMapPin, LucideTrophy],
  templateUrl: './atleta-competencia.html',
})
export class AtletaCompetencia {
  private readonly atletaService = inject(AtletaService);

  readonly athleteId = input.required<number>();

  protected readonly expandedId = signal<number | null>(null);

  /** Torneos ordenados del más reciente al más antiguo. */
  protected readonly competitions = computed(() =>
    [...this.atletaService.profileFor(this.athleteId()).competitions].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    ),
  );

  protected readonly totalMatches = computed(() =>
    this.competitions().reduce((total, competition) => total + competition.matches.length, 0),
  );

  protected readonly wins = computed(() =>
    this.competitions().reduce(
      (total, competition) =>
        total + competition.matches.filter((match) => match.result === 'victoria').length,
      0,
    ),
  );

  protected readonly losses = computed(() => this.totalMatches() - this.wins());

  protected readonly winRate = computed(() => {
    const total = this.totalMatches();
    return total === 0 ? 0 : Math.round((this.wins() / total) * 100);
  });

  protected readonly bestPlacement = computed(() => {
    const placements = this.competitions().map((competition) => competition.placement);
    for (const placement of PLACEMENT_RANK) {
      if (placements.includes(placement)) return placement;
    }
    return placements[0] ?? '—';
  });

  protected toggleExpand(competitionId: number): void {
    this.expandedId.update((current) => (current === competitionId ? null : competitionId));
  }

  protected levelLabel(level: CompetitionLevel): string {
    return LEVEL_LABELS[level];
  }

  protected formatDate(date: Date): string {
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date),
    );
  }

  protected record(competition: Competition): string {
    const won = competition.matches.filter((match) => match.result === 'victoria').length;
    return `${won}V - ${competition.matches.length - won}D`;
  }

  protected levelBadgeClasses(level: CompetitionLevel): string {
    switch (level) {
      case 'internacional':
        return 'bg-amber-100 text-amber-800 ring-1 ring-amber-300';
      case 'nacional':
        return 'bg-blue-100 text-blue-700';
      case 'regional':
        return 'bg-brand-100 text-brand-700';
      case 'club':
        return 'bg-gray-100 text-gray-600';
    }
  }

  /** Resalta los podios respecto del resto de los resultados. */
  protected placementBadgeClasses(placement: string): string {
    return PLACEMENT_RANK.indexOf(placement) <= 2 && PLACEMENT_RANK.includes(placement)
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-600';
  }
}
