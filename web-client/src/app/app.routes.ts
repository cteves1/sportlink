import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'entrenamientos', canActivate: [authGuard], loadComponent: () => import('./training/training-list/training-list').then(m => m.TrainingList) },
  { path: 'calendar', canActivate: [authGuard], loadComponent: () => import('./calendar/calendar').then(m => m.Calendar) },
];
