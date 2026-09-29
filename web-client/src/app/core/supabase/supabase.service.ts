import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export type BackendRole = 'entrenador' | 'admin' | 'jugador';

export interface UserProfile {
  id: string;
  role: BackendRole;
  athlete_id: number | null;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  /** Usuario autenticado de Supabase Auth. */
  readonly user = signal<User | null>(null);

  /** Perfil de negocio vinculado al usuario (rol, athlete_id). */
  readonly profile = signal<UserProfile | null>(null);

  /** Indica que ya se resolvió la sesión inicial. */
  readonly initialized = signal(false);

  constructor() {
    this.client = createClient(environment.supabase.url, environment.supabase.anonKey);
  }

  async initialize(): Promise<void> {
    const { data } = await this.client.auth.getSession();
    this.user.set(data.session?.user ?? null);
    await this.loadProfile();

    this.client.auth.onAuthStateChange((_event, session) => {
      this.user.set(session?.user ?? null);
      void this.loadProfile();
    });

    this.initialized.set(true);
  }

  async loadProfile(): Promise<void> {
    const userId = this.user()?.id;
    if (!userId) {
      this.profile.set(null);
      return;
    }

    const { data, error } = await this.client
      .from('profiles')
      .select('id, role, athlete_id')
      .eq('id', userId)
      .single<UserProfile>();

    if (error || !data) {
      this.profile.set(null);
      return;
    }

    this.profile.set(data);
  }
}
