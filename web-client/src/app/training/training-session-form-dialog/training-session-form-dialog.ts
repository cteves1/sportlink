import { Component, computed, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { StepperModule } from 'primeng/stepper';
import { TextareaModule } from 'primeng/textarea';
import type { TrainingBlock, TrainingSession } from '../training.model';
import { STATUS_OPTIONS, TRAINING_BLOCK_TYPES } from '../training.model';
import { TrainingService } from '../training.service';

type DraftSession = Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt' | 'coachEvaluation' | 'playerFeedback'>;

@Component({
  selector: 'app-training-session-form-dialog',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    StepperModule,
    TextareaModule,
  ],
  templateUrl: './training-session-form-dialog.html',
  styleUrl: './training-session-form-dialog.css',
})
export class TrainingSessionFormDialog {
  visible = model(false);
  sessionToEdit = input<TrainingSession | null>(null);
  saved = output<TrainingSession>();

  step = model<number>(1);
  draft = signal<DraftSession>(this.emptyDraft());
  readonly isEdit = computed(() => !!this.sessionToEdit());
  readonly players = computed(() => this.trainingService.players());
  readonly statusOptions = STATUS_OPTIONS;
  readonly blockTypes = TRAINING_BLOCK_TYPES;

  constructor(private readonly trainingService: TrainingService) {
    effect(() => {
      if (this.visible()) {
        this.step.set(1);
        const session = this.sessionToEdit();
        this.draft.set(session ? this.toDraft(session) : this.emptyDraft());
      }
    });
  }

  addBlock(): void {
    this.draft.update(d => ({
      ...d,
      blocks: [
        ...d.blocks,
        {
          id: this.generateId(),
          name: '',
          description: '',
          duration: 15,
          type: 'Otros',
          order: d.blocks.length + 1,
        } as TrainingBlock,
      ],
    }));
  }

  updateDraft(key: keyof DraftSession, value: unknown): void {
    this.draft.update(d => ({ ...d, [key]: value } as DraftSession));
  }

  updateBlock(id: string, key: keyof TrainingBlock, value: unknown): void {
    this.draft.update(d => ({
      ...d,
      blocks: d.blocks.map(b => (b.id === id ? { ...b, [key]: value } as TrainingBlock : b)),
    }));
  }

  removeBlock(id: string): void {
    this.draft.update(d => {
      const blocks = d.blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i + 1 }));
      return { ...d, blocks };
    });
  }

  moveBlock(id: string, delta: number): void {
    this.draft.update(d => {
      const idx = d.blocks.findIndex(b => b.id === id);
      if (idx < 0) return d;
      const newIndex = idx + delta;
      if (newIndex < 0 || newIndex >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      const [moved] = blocks.splice(idx, 1);
      blocks.splice(newIndex, 0, moved);
      return { ...d, blocks: blocks.map((b, i) => ({ ...b, order: i + 1 })) };
    });
  }

  save(): void {
    const now = new Date().toISOString();
    const existing = this.sessionToEdit();
    const session: TrainingSession = {
      ...this.draft(),
      id: existing?.id ?? this.generateId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      coachEvaluation: existing?.coachEvaluation ?? null,
      playerFeedback: existing?.playerFeedback ?? null,
    };
    this.saved.emit(session);
    this.visible.set(false);
  }

  private emptyDraft(): DraftSession {
    return {
      playerId: this.trainingService.players()[0]?.id ?? '',
      date: this.formatDate(new Date()),
      time: '17:00',
      duration: 90,
      title: '',
      objective: '',
      description: '',
      status: 'Planificado',
      coachNotes: '',
      blocks: [],
    };
  }

  private toDraft(session: TrainingSession): DraftSession {
    return {
      playerId: session.playerId,
      date: session.date,
      time: session.time,
      duration: session.duration,
      title: session.title,
      objective: session.objective,
      description: session.description,
      status: session.status,
      coachNotes: session.coachNotes,
      blocks: [...session.blocks].sort((a, b) => a.order - b.order).map(b => ({ ...b })),
    };
  }

  private generateId(): string {
    return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
