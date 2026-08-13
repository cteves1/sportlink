import { Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../auth/auth.service';
import type { TrainingSession } from '../training.model';
import { STATUS_OPTIONS } from '../training.model';
import { TrainingService } from '../training.service';
import { TrainingFeedbackDialog } from '../training-feedback-dialog/training-feedback-dialog';
import { TrainingSessionFormDialog } from '../training-session-form-dialog/training-session-form-dialog';

@Component({
  selector: 'app-training-list',
  imports: [
    ButtonModule,
    CardModule,
    TagModule,
    ToastModule,
    TrainingSessionFormDialog,
    TrainingFeedbackDialog,
  ],
  templateUrl: './training-list.html',
  styleUrl: './training-list.css',
  providers: [MessageService],
})
export class TrainingList {
  private readonly authService = inject(AuthService);
  private readonly trainingService = inject(TrainingService);
  private readonly messageService = inject(MessageService);

  readonly isCoach = this.authService.isCoach;
  readonly user = this.authService.user;

  readonly sessions = this.trainingService.sessions;
  readonly players = this.trainingService.players;
  readonly statusOptions = STATUS_OPTIONS;

  readonly showForm = signal(false);
  readonly showFeedback = signal(false);
  readonly feedbackMode = signal<'coach' | 'player'>('player');
  readonly selectedSession = signal<TrainingSession | null>(null);

  readonly pageTitle = computed(() => (this.isCoach() ? 'Planificación de entrenamientos' : 'Mis entrenamientos'));

  getPlayerName(playerId: string): string {
    return this.players().find(p => p.id === playerId)?.name ?? playerId;
  }

  getStatusSeverity(status: TrainingSession['status']): 'info' | 'warn' | 'success' | 'danger' | 'secondary' | 'contrast' {
    return this.statusOptions.find(o => o.value === status)?.severity ?? 'secondary';
  }

  openNew(): void {
    this.selectedSession.set(null);
    this.showForm.set(true);
  }

  openEdit(session: TrainingSession): void {
    this.selectedSession.set(session);
    this.showForm.set(true);
  }

  onSessionSaved(session: TrainingSession): void {
    const existing = this.selectedSession();
    if (existing) {
      this.trainingService.updateSession(existing.id, session);
      this.messageService.add({ severity: 'success', summary: 'Sesión actualizada', detail: 'La planificación se ha actualizado correctamente.' });
    } else {
      this.trainingService.addSession(session);
      this.messageService.add({ severity: 'success', summary: 'Sesión creada', detail: 'La nueva sesión ha sido añadida.' });
    }
    this.selectedSession.set(null);
  }

  changeStatus(session: TrainingSession, status: TrainingSession['status']): void {
    this.trainingService.changeStatus(session.id, status);
    this.messageService.add({ severity: 'info', summary: 'Estado actualizado', detail: `La sesión ahora está: ${status}` });
  }

  completeSession(session: TrainingSession, mode: 'coach' | 'player'): void {
    this.trainingService.changeStatus(session.id, 'Completado');
    this.selectedSession.set(session);
    this.feedbackMode.set(mode);
    this.showFeedback.set(true);
  }

  openFeedback(session: TrainingSession, mode: 'coach' | 'player'): void {
    this.selectedSession.set(session);
    this.feedbackMode.set(mode);
    this.showFeedback.set(true);
  }
}
