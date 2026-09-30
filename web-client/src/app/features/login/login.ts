import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PlayersService } from '../../core/players/players.service';
import { CalendarService } from '../../features/calendario/calendar.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly playersService = inject(PlayersService);
  private readonly calendarService = inject(CalendarService);
  private readonly router = inject(Router);

  protected readonly version = environment.version;
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email: rawEmail, password } = this.form.getRawValue();
    const email = rawEmail.trim().includes('@')
      ? rawEmail.trim()
      : `${rawEmail.trim()}@sportlink.local`;
    const result = await this.authService.login(email, password);

    if (!result.success) {
      this.errorMessage.set(result.error ?? 'Credenciales inválidas. Intenta nuevamente.');
      return;
    }

    this.errorMessage.set(null);
    await Promise.all([this.playersService.loadAthletes(), this.calendarService.loadTemplates()]);

    const user = this.authService.user();
    if (user?.role === 'player' && user.athleteId !== undefined) {
      if (this.playersService.isSetupPending(user.athleteId)) {
        void this.router.navigate(['/primer-ingreso']);
        return;
      }
      if (this.playersService.isWelcomeFormPending(user.athleteId)) {
        void this.router.navigate(['/bienvenida']);
        return;
      }
    }

    void this.router.navigate(['/home']);
  }
}
