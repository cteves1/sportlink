import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly authService = inject(AuthService);

  readonly collapsed = input(false);

  protected readonly user = this.authService.user;

  /** El acceso a "Jugadores" queda reservado al entrenador (rol admin). */
  protected readonly isAdmin = computed(() => this.user()?.role !== 'player');
}
