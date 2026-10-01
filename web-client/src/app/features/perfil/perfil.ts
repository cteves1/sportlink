import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendar,
  LucideCrown,
  LucideMail,
  LucideShieldCheck,
  LucideUser,
} from '@lucide/angular';
import { AuthService, AppRole } from '../../core/auth/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    RouterLink,
    LucideUser,
    LucideMail,
    LucideShieldCheck,
    LucideCalendar,
    LucideCrown,
    LucideArrowLeft,
  ],
  templateUrl: './perfil.html',
})
export class Perfil {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.user;

  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    const labels: Record<AppRole, string> = {
      admin: 'Entrenador / Admin',
      player: 'Jugador',
    };
    return role ? labels[role] : '-';
  });

  protected readonly memberSinceLabel = computed(() => {
    const iso = this.user()?.memberSince;
    if (!iso) return '-';
    const date = new Date(iso);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  });

  protected readonly membershipDuration = computed(() => {
    const iso = this.user()?.memberSince;
    if (!iso) return '';
    const start = new Date(iso);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    const totalMonths = years * 12 + months;
    if (totalMonths < 1) return 'Miembro nuevo';
    if (totalMonths < 12) return `${totalMonths} mes${totalMonths === 1 ? '' : 'es'}`;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    const yearText = `${y} año${y === 1 ? '' : 's'}`;
    return m > 0 ? `${yearText} y ${m} mes${m === 1 ? '' : 'es'}` : yearText;
  });

  protected goToMyAthlete(): void {
    const athleteId = this.authService.user()?.athleteId;
    if (athleteId !== undefined) {
      void this.router.navigate(['/jugadores', athleteId]);
    }
  }
}
