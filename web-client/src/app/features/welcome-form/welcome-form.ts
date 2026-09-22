import { Component, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCheck,
  LucideHeart,
  LucideHistory,
  LucideTarget,
} from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import {
  PaddleGrip,
  PlayersService,
  PlayingStyle,
  RubberType,
  WEEKDAY_OPTIONS,
  Weekday,
  WelcomeFormAnswers,
} from '../../core/players/players.service';

type Step = 1 | 2 | 3;

/** Nombre del control booleano que representa cada día en el grupo `trainingDays`. */
function dayControlName(weekday: Weekday): string {
  return `dia${weekday}`;
}

/**
 * Formulario de bienvenida que completa un jugador recién dado de alta en su primer login.
 * Pantalla completa (fuera del `Shell`), obligatoria antes de acceder al resto de la app:
 * el guard `pendingWelcomeFormGuard`/`welcomeFormGuard` (ver `core/auth/auth.guard.ts`) se
 * encargan de redirigir hacia y desde esta ruta según corresponda.
 */
@Component({
  selector: 'app-welcome-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LucideTarget,
    LucideHeart,
    LucideHistory,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCheck,
  ],
  templateUrl: './welcome-form.html',
})
export class WelcomeForm {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly playersService = inject(PlayersService);
  private readonly router = inject(Router);

  protected readonly step = signal<Step>(1);

  protected readonly weekdays = WEEKDAY_OPTIONS;
  protected readonly dayControlName = dayControlName;

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

  // Sección 3: Experiencia previa + perfil de juego según el nivel autopercibido.
  protected readonly experienceForm = this.fb.nonNullable.group({
    yearsPlaying: ['menos-de-1' as WelcomeFormAnswers['yearsPlaying'], Validators.required],
    hasCompeted: [false],
    selfPerceivedLevel: [
      'principiante' as WelcomeFormAnswers['selfPerceivedLevel'],
      Validators.required,
    ],
    // Desde nivel intermedio.
    paddleGrip: ['clasica' as PaddleGrip, Validators.required],
    rubberForehand: ['liso' as RubberType, Validators.required],
    rubberBackhand: ['liso' as RubberType, Validators.required],
    playingStyle: ['all-round' as PlayingStyle, Validators.required],
    // Solo nivel avanzado.
    club: ['', Validators.required],
    specificGoal: ['', Validators.required],
    trainingDays: this.fb.nonNullable.group({
      dia1: [false],
      dia2: [false],
      dia3: [false],
      dia4: [false],
      dia5: [false],
      dia6: [false],
      dia7: [false],
    }),
  });

  /** Nivel autopercibido como signal, para condicionar los campos del paso 3. */
  private readonly level = toSignal(this.experienceForm.controls.selfPerceivedLevel.valueChanges, {
    initialValue: this.experienceForm.controls.selfPerceivedLevel.value,
  });

  /** Desde intermedio se piden paleta, gomas y estilo de juego. */
  protected readonly showIntermediateFields = computed(() => this.level() !== 'principiante');
  /** Solo los avanzados declaran club, días de entrenamiento y objetivo concreto. */
  protected readonly showAdvancedFields = computed(() => this.level() === 'avanzado');

  constructor() {
    // Los campos que no aplican al nivel se deshabilitan para que no bloqueen la validación.
    effect(() => {
      const intermediate = this.showIntermediateFields();
      const advanced = this.showAdvancedFields();
      const controls = this.experienceForm.controls;
      this.setEnabled(controls.paddleGrip, intermediate);
      this.setEnabled(controls.rubberForehand, intermediate);
      this.setEnabled(controls.rubberBackhand, intermediate);
      this.setEnabled(controls.playingStyle, intermediate);
      this.setEnabled(controls.club, advanced);
      this.setEnabled(controls.specificGoal, advanced);
      this.setEnabled(controls.trainingDays, advanced);
    });
  }

  /** Habilita o deshabilita un control sin disparar `valueChanges` (evita bucles con el effect). */
  private setEnabled(control: AbstractControl, enabled: boolean): void {
    if (enabled) {
      control.enable({ emitEvent: false });
    } else {
      control.disable({ emitEvent: false });
    }
  }

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

    const experience = this.experienceForm.getRawValue();
    const isIntermediateOrAbove = experience.selfPerceivedLevel !== 'principiante';
    const isAdvanced = experience.selfPerceivedLevel === 'avanzado';

    const answers: WelcomeFormAnswers = {
      ...this.goalsForm.getRawValue(),
      ...this.motivationForm.getRawValue(),
      yearsPlaying: experience.yearsPlaying,
      hasCompeted: experience.hasCompeted,
      selfPerceivedLevel: experience.selfPerceivedLevel,
      paddleGrip: isIntermediateOrAbove ? experience.paddleGrip : null,
      rubberForehand: isIntermediateOrAbove ? experience.rubberForehand : null,
      rubberBackhand: isIntermediateOrAbove ? experience.rubberBackhand : null,
      playingStyle: isIntermediateOrAbove ? experience.playingStyle : null,
      club: isAdvanced ? experience.club.trim() || null : null,
      specificGoal: isAdvanced ? experience.specificGoal.trim() || null : null,
      trainingDays: isAdvanced ? this.selectedTrainingDays(experience.trainingDays) : [],
    };

    this.playersService.submitWelcomeForm(user.athleteId, answers);
    void this.router.navigate(['/home']);
  }

  /** Traduce el grupo de checkboxes a la lista ordenada de días de entrenamiento. */
  private selectedTrainingDays(group: Record<string, boolean>): Weekday[] {
    return WEEKDAY_OPTIONS.filter((option) => group[dayControlName(option.value)]).map(
      (option) => option.value,
    );
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
