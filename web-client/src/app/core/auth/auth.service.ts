import { Injectable, inject, signal } from '@angular/core';
import { PlayersService } from '../players/players.service';

/** Rol real derivado del login: 'admin' es el entrenador, 'player' un jugador. */
export type AppRole = 'admin' | 'player';

export interface AuthUser {
  name: string;
  email: string;
  role: AppRole;
  /** Id del atleta en PlayersService, presente solo cuando role === 'player'. */
  athleteId?: number;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

const STORAGE_KEY = 'tt-trainer-auth-user';

/** Dominio ficticio usado para simular el login de un jugador con su usuario generado (nombre.apellido). */
const PLAYER_MOCK_DOMAIN = '@ttclub.mock';

const INVALID_CREDENTIALS_ERROR = 'Credenciales inválidas. Intenta nuevamente.';

/** Cuenta demo fija para probar rápidamente el rol de entrenador. */
const DEMO_ADMIN_EMAIL = 'entrenador@ttclub.mock';
const DEMO_PASSWORD = '1234';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly playersService = inject(PlayersService);
  private readonly _user = signal<AuthUser | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = () => this._user() !== null;

  login(email: string, password: string): LoginResult {
    if (!email || !password) {
      return { success: false, error: INVALID_CREDENTIALS_ERROR };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { success: false, error: INVALID_CREDENTIALS_ERROR };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Cuenta demo: entrenador@ttclub.mock (admin), clave 1234.
    if (normalizedEmail === DEMO_ADMIN_EMAIL) {
      if (password !== DEMO_PASSWORD) {
        return { success: false, error: INVALID_CREDENTIALS_ERROR };
      }

      return this.startSession({ name: 'Entrenador Demo', email, role: 'admin' });
    }

    // Login de jugador: username@ttclub.mock. Se valida el estado de la cuenta contra PlayersService.
    if (normalizedEmail.endsWith(PLAYER_MOCK_DOMAIN)) {
      const username = normalizedEmail.slice(0, -PLAYER_MOCK_DOMAIN.length);
      const player = this.playersService.findByUsername(username);

      if (!player) {
        return { success: false, error: INVALID_CREDENTIALS_ERROR };
      }

      if (player.status === 'inactivo') {
        return { success: false, error: 'Tu cuenta se encuentra inactiva. Contacta al entrenador.' };
      }

      return this.startSession({
        name: `${player.firstName} ${player.lastName}`,
        email,
        role: 'player',
        athleteId: player.id,
      });
    }

    return this.startSession({ name: email.split('@')[0], email, role: 'admin' });
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private startSession(user: AuthUser): LoginResult {
    this._user.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return { success: true };
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
