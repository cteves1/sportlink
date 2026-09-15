import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { NavbarTop } from '../navbar-top/navbar-top';
import { NavbarBottom } from '../navbar-bottom/navbar-bottom';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Sidebar, NavbarTop, NavbarBottom],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly sidebarCollapsed = signal(false);

  /** En pantallas chicas el sidebar se muestra como panel deslizante sobre el contenido. */
  protected readonly mobileMenuOpen = signal(false);

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
