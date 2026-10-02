import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendar,
  LucideCrown,
  LucideEye,
  LucideEyeOff,
  LucideLock,
  LucideMail,
  LucidePencil,
  LucideShieldCheck,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { AuthService, AppRole } from '../../core/auth/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    LucideUser,
    LucideMail,
    LucideShieldCheck,
    LucideCalendar,
    LucideCrown,
    LucidePencil,
    LucideX,
    LucideArrowLeft,
    LucideLock,
    LucideEye,
    LucideEyeOff,
  ],
  templateUrl: './perfil.html',
})
export class Perfil {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.user;

  protected readonly isEditing = signal(false);
  protected readonly saving = signal(false);
  protected readonly editName = signal('');
  protected readonly editSubscriptionTier = signal('');
  protected readonly editError = signal<string | null>(null);

  protected readonly isEditingPassword = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

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

  protected startEditing(): void {
    const current = this.user();
    if (!current) return;
    this.editName.set(current.name);
    this.editSubscriptionTier.set(current.subscriptionTier);
    this.editError.set(null);
    this.isEditing.set(true);
  }

  protected cancelEditing(): void {
    this.isEditing.set(false);
    this.editError.set(null);
  }

  protected async saveProfile(): Promise<void> {
    this.saving.set(true);
    this.editError.set(null);

    const result = await this.authService.updateUserMetadata({
      name: this.editName().trim(),
      subscriptionTier: this.editSubscriptionTier().trim() || 'Estándar',
    });

    this.saving.set(false);

    if (!result.success) {
      this.editError.set(result.error ?? 'No se pudo guardar el perfil.');
      return;
    }

    this.isEditing.set(false);
  }

  protected startEditingPassword(): void {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordError.set(null);
    this.isEditingPassword.set(true);
  }

  protected cancelEditingPassword(): void {
    this.isEditingPassword.set(false);
    this.passwordError.set(null);
  }

  protected toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword.update((value) => !value);
  }

  protected toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((value) => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  protected async savePassword(): Promise<void> {
    this.savingPassword.set(true);
    this.passwordError.set(null);

    const current = this.currentPassword().trim();
    const next = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (current.length === 0 || next.length === 0 || confirm.length === 0) {
      this.passwordError.set('Completá todos los campos.');
      this.savingPassword.set(false);
      return;
    }

    if (next.length < 4) {
      this.passwordError.set('La nueva contraseña debe tener al menos 4 caracteres.');
      this.savingPassword.set(false);
      return;
    }

    if (next !== confirm) {
      this.passwordError.set('Las contraseñas nuevas no coinciden.');
      this.savingPassword.set(false);
      return;
    }

    const result = await this.authService.updatePassword({
      currentPassword: current,
      newPassword: next,
    });

    this.savingPassword.set(false);

    if (!result.success) {
      this.passwordError.set(result.error ?? 'No se pudo cambiar la contraseña.');
      return;
    }

    this.isEditingPassword.set(false);
  }
}
