import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowRight, LucideCircleAlert, LucideScanEye, LucideTarget } from '@lucide/angular';
import { CoachModeService } from '../coach-mode.service';
import { Drill } from '../coach-mode.models';
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

  protected readonly drills = this.coachModeService.drills;
  protected readonly selectedDrillId = this.coachModeService.selectedDrillId;
  protected readonly selectedDrill = this.coachModeService.selectedDrill;

  /** `null` mientras se detecta soporte; luego queda en `true`/`false`. */
  protected readonly arSupported = signal<boolean | null>(null);

  constructor() {
    isArSupported().then((supported) => this.arSupported.set(supported));
  }

  protected selectDrill(drill: Drill): void {
    this.coachModeService.selectDrill(drill.id);
  }

  protected startArSession(): void {
    const drill = this.selectedDrill();
    if (!drill || !this.arSupported()) return;
    this.router.navigate(['/coach-mode/ar', drill.id]);
  }

  protected shotTypeLabel(drill: Drill): string {
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
}
