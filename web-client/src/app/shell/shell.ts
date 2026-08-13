import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ToolbarModule } from 'primeng/toolbar';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-shell',
  imports: [ToolbarModule, AvatarModule, ButtonModule, MenuModule],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly isDark = this.themeService.isDark;

  readonly sidebarCollapsed = signal(false);
  readonly activeOption = signal(this.routeToId(this.router.url));

  readonly menuItems = computed<MenuItem[]>(() => [
    {
      id: 'overview',
      label: 'Resumen',
      icon: 'pi pi-home',
      styleClass: this.activeOption() === 'overview' ? 'menu-item-active' : '',
      command: () => this.navigate('/dashboard', 'overview'),
    },
    {
      id: 'training',
      label: 'Entrenamientos',
      icon: 'pi pi-chart-line',
      styleClass: this.activeOption() === 'training' ? 'menu-item-active' : '',
      command: () => this.setActive('training'),
    },
    {
      id: 'calendar',
      label: 'Calendario',
      icon: 'pi pi-calendar',
      styleClass: this.activeOption() === 'calendar' ? 'menu-item-active' : '',
      command: () => this.navigate('/calendar', 'calendar'),
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: 'pi pi-user',
      styleClass: this.activeOption() === 'profile' ? 'menu-item-active' : '',
      command: () => this.setActive('profile'),
    },
  ]);

  private routeToId(url: string): string {
    if (url === '/dashboard' || url.startsWith('/dashboard')) return 'overview';
    if (url === '/calendar' || url.startsWith('/calendar')) return 'calendar';
    return 'overview';
  }

  private navigate(path: string, id: string): void {
    this.setActive(id);
    this.router.navigate([path]);
  }

  private setActive(id: string): void {
    this.activeOption.set(id);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
