import { Injectable, computed, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

/** Rol simplificado que usa la app: admin engloba entrenador/admin; player es jugador. */
export type AppRole = 'admin' | 'player';

export interface AuthUser {
  name: string;
  email: string;
  role: AppRole;
  /** Id del atleta en Supabase, presente solo cuando role === 'player'. */
  athleteId?: number;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabaseService = inject(SupabaseService);

  readonly user = computed<AuthUser | null>(() => {
    const authUser = this.supabaseService.user();
    const profile = this.supabaseService.profile();

    if (!authUser || !profile) {
      return null;
    }

    const role: AppRole = profile.role === 'jugador' ? 'player' : 'admin';

    return {
      name: (authUser.user_metadata?.['name'] as string | undefined) ?? authUser.email ?? '',
      email: authUser.email ?? '',
      role,
      athleteId: profile.athlete_id ?? undefined,
    };
  });

  readonly isLoggedIn = computed(() => this.user() !== null);

  async login(email: string, password: string): Promise<LoginResult> {
    if (!email || !password) {
      return { success: false, error: 'Ingresá email y contraseña.' };
    }

    const { error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await this.supabaseService.loadProfile();
    return { success: true };
  }

  async logout(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
  }
}
