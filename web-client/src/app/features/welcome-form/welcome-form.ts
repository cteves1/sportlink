import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideCheck, LucideHeart, LucideHistory, LucideTarget } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { PlayersService, WelcomeFormAnswers } from '../../core/players/players.service';

type Step = 1 | 2 | 3;

/**
 * Formulario de bienvenida que completa un jugador recién dado de alta en su primer login.
 * Pantalla completa (fuera del `Shell`), obligatoria antes de acceder al resto de la app:
 * el guard `pendingWelcomeFormGuard`/`welcomeFormGuard` (ver `core/auth/auth.guard.ts`) se
 * encargan de redirigir hacia y desde esta ruta según corresponda.
 */
@Component({
  selector: 'app-welcome-form',
  standalone: true,
  imports: [ReactiveFormsModule, LucideTarget, LucideHeart, LucideHistory, LucideArrowLeft, LucideArrowRight, LucideCheck],
  templateUrl: './welcome-form.html',
})
export class WelcomeForm {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly playersService = inject(PlayersService);
  private readonly router = inject(Router);

  protected readonly step = signal<Step>(1);

  protected readonly athleteFirstName = computed(() => {
    const user = this.authService.user();
    return user ? user.name.split(' ')[0] : '';
  });

  // Sección 1: Objetivos
  protected readonly goalsForm = this.fb.nonNullable.group({
    mainGoal: ['competir' as WelcomeFormAnswers['mainGoal'], Validators.required],
    shortTermGoal: ['', Validators.required],
    longTermGoal: ['', Validators.required],
  });

  // Sección 2: Motivación
  protected readonly motivationForm = this.fb.nonNullable.group({
    motivation: ['', Validators.required],
    coachSupport: ['', Validators.required],
  });

  // Sección 3: Experiencia previa
  protected readonly experienceForm = this.fb.nonNullable.group({
    yearsPlaying: ['menos-de-1' as WelcomeFormAnswers['yearsPlaying'], Validators.required],
    hasCompeted: [false],
    selfPerceivedLevel: ['principiante' as WelcomeFormAnswers['selfPerceivedLevel'], Validators.required],
  });

  protected goToNext(): void {
    const currentForm = this.formForStep(this.step());
    if (currentForm.invalid) {
      currentForm.markAllAsTouched();
      return;
    }
    if (this.step() < 3) {
      this.step.update((current) => (current + 1) as Step);
    }
  }

  protected goToPrevious(): void {
    if (this.step() > 1) {
      this.step.update((current) => (current - 1) as Step);
    }
  }

  protected submitForm(): void {
    if (this.experienceForm.invalid) {
      this.experienceForm.markAllAsTouched();
      return;
    }

    const user = this.authService.user();
    if (!user?.athleteId) {
      return;
    }

    const answers: WelcomeFormAnswers = {
      ...this.goalsForm.getRawValue(),
      ...this.motivationForm.getRawValue(),
      ...this.experienceForm.getRawValue(),
    };

    this.playersService.submitWelcomeForm(user.athleteId, answers);
    void this.router.navigate(['/home']);
  }

  private formForStep(step: Step) {
    switch (step) {
      case 1:
        return this.goalsForm;
      case 2:
        return this.motivationForm;
      case 3:
        return this.experienceForm;
    }
  }
}
