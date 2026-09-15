import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-navbar-top',
  standalone: true,
  templateUrl: './navbar-top.html',
})
export class NavbarTop {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly toggleSidebar = output<void>();

  readonly toggleMobileMenu = output<void>();

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
