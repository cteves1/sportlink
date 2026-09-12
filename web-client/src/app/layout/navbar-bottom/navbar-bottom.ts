import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar-bottom',
  standalone: true,
  templateUrl: './navbar-bottom.html',
})
export class NavbarBottom {
  protected readonly year = new Date().getFullYear();
}
