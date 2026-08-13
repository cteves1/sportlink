import { Component, effect, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import type { CoachEvaluation, PlayerFeedback, TrainingSession } from '../training.model';
import { TrainingService } from '../training.service';

@Component({
  selector: 'app-training-feedback-dialog',
  imports: [FormsModule, ButtonModule, DialogModule, InputNumberModule, TextareaModule],
  templateUrl: './training-feedback-dialog.html',
  styleUrl: './training-feedback-dialog.css',
})
export class TrainingFeedbackDialog {
  visible = model(false);
  session = input<TrainingSession | null>(null);
  mode = input<'coach' | 'player'>('player');

  intensity = 7;
  performance = 7;
  difficulty = 5;
  observations = '';
  feelings = '';
  comments = '';

  constructor(
    private readonly trainingService: TrainingService,
    private readonly messageService: MessageService,
  ) {
    effect(() => {
      if (this.visible()) {
        this.reset();
      }
    });
  }

  reset(): void {
    const existing = this.session();
    const coach = existing?.coachEvaluation;
    const player = existing?.playerFeedback;

    this.intensity = coach?.intensity ?? 7;
    this.performance = coach?.performance ?? 7;
    this.observations = coach?.observations ?? '';
    this.difficulty = player?.difficulty ?? 5;
    this.feelings = player?.feelings ?? '';
    this.comments = player?.comments ?? '';
  }

  save(): void {
    const id = this.session()?.id;
    if (!id) return;

    if (this.mode() === 'coach') {
      const evaluation: CoachEvaluation = {
        intensity: this.intensity,
        performance: this.performance,
        observations: this.observations,
      };
      this.trainingService.addCoachEvaluation(id, evaluation);
      this.messageService.add({ severity: 'success', summary: 'Evaluación guardada', detail: 'La evaluación del entrenador se ha registrado.' });
    } else {
      const feedback: PlayerFeedback = {
        feelings: this.feelings,
        difficulty: this.difficulty,
        comments: this.comments,
      };
      this.trainingService.addPlayerFeedback(id, feedback);
      this.messageService.add({ severity: 'success', summary: 'Feedback guardado', detail: 'Tus sensaciones han sido registradas.' });
    }

    this.visible.set(false);
  }
}
