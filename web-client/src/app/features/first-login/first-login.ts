import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PlayersService } from '../../core/players/players.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { LucideEye, LucideEyeOff } from '@lucide/angular';

@Component({
  selector: 'app-first-login',
  standalone: true,
  imports: [ReactiveFormsModule, LucideEye, LucideEyeOff],
  templateUrl: './first-login.html',
})
export class FirstLogin {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly playersService = inject(PlayersService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected readonly isRecovering = signal(false);
  protected readonly recoveryMessage = signal<string | null>(null);
  protected readonly emailUsed = signal(false);

  protected readonly athleteId = computed(() => this.authService.user()?.athleteId);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    confirmEmail: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    const { email, confirmEmail, password, confirmPassword } = this.form.getRawValue();

    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      this.errorMessage.set('Los emails no coinciden.');
      return;
    }

    if (password !== confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    const athleteId = this.athleteId();
    if (athleteId === undefined) {
      this.errorMessage.set('No se encontró el jugador asociado a tu cuenta.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const used = await this.playersService.isEmailUsed(normalizedEmail);
    if (used) {
      this.emailUsed.set(true);
      this.errorMessage.set(
        'Ese email ya está registrado. Si te olvidaste la contraseña, podés recuperarla.',
      );
      return;
    }

    const { error: passwordError } = await this.supabaseService.client.auth.updateUser({
      password,
    });

    if (passwordError) {
      this.errorMessage.set(passwordError.message);
      return;
    }

    await this.playersService.completeSetup(athleteId, email.trim().toLowerCase());
    await this.playersService.loadAthletes();

    if (this.playersService.isWelcomeFormPending(athleteId)) {
      void this.router.navigate(['/bienvenida']);
    } else {
      void this.router.navigate(['/home']);
    }
  }

  protected togglePasswordVisible(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected async recoverPassword(): Promise<void> {
    const email = this.form.getRawValue().email.trim().toLowerCase();
    if (!email) {
      this.errorMessage.set('Ingresá tu email para recuperar la contraseña.');
      return;
    }

    this.isRecovering.set(true);
    this.recoveryMessage.set(null);
    this.errorMessage.set(null);

    const result = await this.authService.resetPassword(email);

    this.isRecovering.set(false);
    if (!result.success) {
      this.errorMessage.set(result.error ?? 'No se pudo enviar el email de recuperación.');
      return;
    }

    this.recoveryMessage.set(
      'Te enviamos un email para recuperar tu contraseña. Revisá tu bandeja de entrada.',
    );
  }

  protected toggleConfirmPasswordVisible(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }
}
