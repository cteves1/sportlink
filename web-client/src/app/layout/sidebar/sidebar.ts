import { Component, computed, inject, input, output } from '@angular/core';
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

  /** En mobile el sidebar se despliega como drawer sobre el contenido. */
  readonly mobileOpen = input(false);

  /** Se emite al usar un enlace, para que el Shell cierre el drawer en mobile. */
  readonly navigate = output<void>();

  protected readonly user = this.authService.user;

  /** El acceso a "Jugadores" queda reservado al entrenador (rol admin). */
  protected readonly isAdmin = computed(() => this.user()?.role !== 'player');

  /** El modo colapsado (solo iconos) aplica al sidebar de escritorio, nunca al drawer mobile. */
  protected readonly labelsHidden = computed(() => this.collapsed() && !this.mobileOpen());
}
