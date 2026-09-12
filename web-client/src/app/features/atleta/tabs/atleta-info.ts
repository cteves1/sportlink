import { Component, computed, inject, input } from '@angular/core';
import { LucideBuilding2, LucideMessageCircle, LucideSwords, LucideUserRound } from '@lucide/angular';
import { Athlete } from '../../../core/players/players.service';
import { AtletaService } from '../atleta.service';

@Component({
  selector: 'app-atleta-info',
  standalone: true,
  imports: [LucideBuilding2, LucideMessageCircle, LucideSwords, LucideUserRound],
  templateUrl: './atleta-info.html',
})
export class AtletaInfo {
  private readonly atletaService = inject(AtletaService);

  readonly athlete = input.required<Athlete>();

  protected readonly profile = computed(() => this.atletaService.profileFor(this.athlete().id));

  protected readonly birthDateLabel = computed(() =>
    new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      this.athlete().birthDate,
    ),
  );

  /** Edad cumplida a la fecha de hoy. */
  protected readonly age = computed(() => {
    const birth = this.athlete().birthDate;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  });

  /** Cuadro competitivo estimado a partir de la edad (referencia para el entrenador). */
  protected readonly ageGroup = computed(() => {
    const age = this.age();
    if (age <= 11) return 'Sub-11';
    if (age <= 13) return 'Sub-13';
    if (age <= 15) return 'Sub-15';
    if (age <= 19) return 'Sub-19';
    if (age <= 21) return 'Sub-21';
    return 'Mayores';
  });

  /** Enlace de WhatsApp al entrenador local (wa.me solo acepta dígitos). */
  protected readonly coachWhatsappLink = computed(() => {
    const club = this.profile().club;
    const digitsOnly = club.coachPhone.replace(/[^0-9]/g, '');
    const message = `¡Hola ${club.localCoach}! Te escribo por el seguimiento de ${this.athlete().firstName} ${this.athlete().lastName}.`;
    return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
  });
}
