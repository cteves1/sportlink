import { computed, Injectable, signal } from '@angular/core';
import type { CoachEvaluation, Player, PlayerFeedback, TrainingSession } from './training.model';
import { MOCK_PLAYERS, MOCK_SESSIONS } from './training.model';

export type SessionStatus = TrainingSession['status'];

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly sessionsSignal = signal<TrainingSession[]>([...MOCK_SESSIONS]);
  readonly sessions = this.sessionsSignal.asReadonly();

  readonly players = signal<Player[]>([...MOCK_PLAYERS]);

  readonly sessionsForCurrentRole = (playerId?: string) => computed(() => {
    if (!playerId) {
      return this.sessionsSignal();
    }
    return this.sessionsSignal().filter(s => s.playerId === playerId);
  });

  addSession(session: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>): TrainingSession {
    const now = new Date().toISOString();
    const newSession: TrainingSession = {
      ...session,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.sessionsSignal.update(list => [newSession, ...list]);
    return newSession;
  }

  updateSession(id: string, changes: Partial<TrainingSession>): TrainingSession | null {
    let updated: TrainingSession | null = null;
    this.sessionsSignal.update(list =>
      list.map(session => {
        if (session.id !== id) return session;
        updated = { ...session, ...changes, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    return updated;
  }

  getSession(id: string): TrainingSession | undefined {
    return this.sessionsSignal().find(s => s.id === id);
  }

  changeStatus(id: string, status: SessionStatus): TrainingSession | null {
    return this.updateSession(id, { status });
  }

  addCoachNotes(id: string, notes: string): TrainingSession | null {
    return this.updateSession(id, { coachNotes: notes });
  }

  addCoachEvaluation(id: string, evaluation: CoachEvaluation): TrainingSession | null {
    return this.updateSession(id, { coachEvaluation: evaluation });
  }

  addPlayerFeedback(id: string, feedback: PlayerFeedback): TrainingSession | null {
    return this.updateSession(id, { playerFeedback: feedback });
  }

  deleteSession(id: string): void {
    this.sessionsSignal.update(list => list.filter(s => s.id !== id));
  }

  private generateId(): string {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
}
