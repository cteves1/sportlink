import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideArrowLeft,
  LucideCalendarRange,
  LucideClipboardCheck,
  LucideDumbbell,
  LucideTrophy,
  LucideUserRound,
} from '@lucide/angular';
import { PlayersService, categoryLabel, isEliteCategory } from '../../core/players/players.service';
import { AtletaAsistencia } from './tabs/atleta-asistencia';
import { AtletaCalendarioAnual } from './tabs/atleta-calendario-anual';
import { AtletaCompetencia } from './tabs/atleta-competencia';
import { AtletaEntrenamiento } from './tabs/atleta-entrenamiento';
import { AtletaInfo } from './tabs/atleta-info';

type TabId = 'info' | 'entrenamiento' | 'asistencia' | 'competencia' | 'anual';

@Component({
  selector: 'app-atleta-detalle',
  standalone: true,
  imports: [
    RouterLink,
    LucideArrowLeft,
    LucideCalendarRange,
    LucideClipboardCheck,
    LucideDumbbell,
    LucideTrophy,
    LucideUserRound,
    AtletaInfo,
    AtletaEntrenamiento,
    AtletaAsistencia,
    AtletaCompetencia,
    AtletaCalendarioAnual,
  ],
  templateUrl: './atleta-detalle.html',
})
export class AtletaDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly playersService = inject(PlayersService);

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly categoryLabel = categoryLabel;

  protected readonly athleteId = computed(() => Number(this.params().get('id')));

  protected readonly athlete = computed(() => {
    const id = this.athleteId();
    if (!Number.isFinite(id)) return undefined;
    return this.playersService.athletes().find((candidate) => candidate.id === id);
  });

  /** La ficha de seguimiento solo aplica a los atletas de Atleta Elite y categoría 1. */
  protected readonly isElite = computed(() => {
    const category = this.athlete()?.category;
    return category !== undefined && isEliteCategory(category);
  });

  protected readonly activeTab = signal<TabId>('info');

  protected selectTab(tab: TabId): void {
    this.activeTab.set(tab);
  }
}
