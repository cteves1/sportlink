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
  /** Fecha ISO en que se creó la cuenta en Supabase Auth. */
  memberSince: string;
  /** Nivel de suscripción del usuario (se lee de user_metadata; por defecto 'Estándar'). */
  subscriptionTier: string;
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
      memberSince: authUser.created_at,
      subscriptionTier: (authUser.user_metadata?.['subscription_tier'] as string | undefined) ?? 'Estándar',
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

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/primer-ingreso',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async updateUserMetadata(input: {
    name: string;
    subscriptionTier: string;
  }): Promise<{ success: boolean; error?: string }> {
    const {
      data: { user },
      error,
    } = await this.supabaseService.client.auth.updateUser({
      data: {
        name: input.name,
        subscription_tier: input.subscriptionTier,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    this.supabaseService.user.set(user);
    return { success: true };
  }

  async updatePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    const email = this.user()?.email;
    if (!email) {
      return { success: false, error: 'No se pudo identificar al usuario.' };
    }

    // Verifica la contraseña actual antes de cambiarla.
    const { error: signInError } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password: input.currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'La contraseña actual es incorrecta.' };
    }

    const { error: updateError } = await this.supabaseService.client.auth.updateUser({
      password: input.newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  }
}
