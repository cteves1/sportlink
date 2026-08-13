import { computed, Injectable, signal } from '@angular/core';

export type UserRole = 'coach' | 'player';

export interface MockUser {
  name: string;
  email: string;
  avatarInitials: string;
  role: UserRole;
}

function isCoachEmail(email: string): boolean {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  const coachKeywords = ['coach', 'entrenador', 'trainer', 'profesor'];
  return coachKeywords.some(k => local.includes(k) || domain.includes(k));
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<MockUser | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = signal(false);
  readonly isCoach = computed(() => this.user()?.role === 'coach');
  readonly isPlayer = computed(() => this.user()?.role === 'player');

  login(email: string): void {
    const name = email.split('@')[0] || 'Jugador';
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    const role: UserRole = isCoachEmail(email) ? 'coach' : 'player';

    this.userSignal.set({
      name: displayName,
      email: email || 'jugador@ejemplo.com',
      avatarInitials: displayName.slice(0, 2).toUpperCase(),
      role,
    });
    this.isLoggedIn.set(true);
  }

  logout(): void {
    this.userSignal.set(null);
    this.isLoggedIn.set(false);
  }
}
