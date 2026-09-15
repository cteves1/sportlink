import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowRight, LucideCircleAlert, LucideScanEye, LucideTarget } from '@lucide/angular';
import { CoachModeService } from '../coach-mode.service';
import { Drill, DrillCategory } from '../coach-mode.models';
import { isArSupported } from '../ar/ar-support';

@Component({
  selector: 'app-coach-mode-config',
  standalone: true,
  imports: [LucideScanEye, LucideTarget, LucideArrowRight, LucideCircleAlert],
  templateUrl: './coach-mode-config.html',
})
export class CoachModeConfig {
  private readonly coachModeService = inject(CoachModeService);
  private readonly router = inject(Router);

  protected readonly selectedDrillId = this.coachModeService.selectedDrillId;
  protected readonly selectedDrill = this.coachModeService.selectedDrill;

  /** Pestaña activa: los ejercicios con pelota se muestran primero. */
  protected readonly category = signal<DrillCategory>('pelota');

  protected readonly drills = computed(() =>
    this.coachModeService.drills().filter((drill) => drill.category === this.category()),
  );

  /** `null` mientras se detecta soporte; luego queda en `true`/`false`. */
  protected readonly arSupported = signal<boolean | null>(null);

  constructor() {
    isArSupported().then((supported) => this.arSupported.set(supported));
  }

  protected selectDrill(drill: Drill): void {
    this.coachModeService.selectDrill(drill.id);
  }

  protected selectCategory(category: DrillCategory): void {
    if (category === this.category()) return;
    this.category.set(category);
    this.coachModeService.clearSelection();
  }

  protected startArSession(): void {
    const drill = this.selectedDrill();
    if (!drill || !this.arSupported()) return;
    this.router.navigate(['/coach-mode/ar', drill.id]);
  }

  /** Etiqueta del tipo de trabajo: golpe para los de pelota, foco físico para los de conos. */
  protected drillTypeLabel(drill: Drill): string {
    if (drill.category === 'fisico') {
      switch (drill.focus) {
        case 'desplazamiento':
          return 'Desplazamiento';
        case 'agilidad':
          return 'Agilidad';
        case 'resistencia':
          return 'Resistencia';
      }
    }

    switch (drill.shotType) {
      case 'topspin-derecha':
        return 'Topspin de derecha';
      case 'topspin-reves':
        return 'Topspin de revés';
      case 'saque':
        return 'Saque';
      case 'bloqueo':
        return 'Bloqueo';
    }
  }

  protected conesLabel(drill: Drill): string | null {
    return drill.category === 'fisico' ? `${drill.cones.length} conos` : null;
  }
}
