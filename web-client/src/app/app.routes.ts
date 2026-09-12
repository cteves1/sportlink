import { Routes } from '@angular/router';
import { authGuard, adminGuard, welcomeFormGuard, pendingWelcomeFormGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    // Formulario de bienvenida (objetivos/motivación/experiencia) del jugador recién dado de alta:
    // pantalla completa, fuera del Shell, obligatoria antes de acceder al resto de la app.
    path: 'bienvenida',
    loadComponent: () => import('./features/welcome-form/welcome-form').then((m) => m.WelcomeForm),
    canActivate: [authGuard, pendingWelcomeFormGuard],
  },
  {
    // Sesión de Realidad Aumentada del Modo Entrenador: pantalla completa, sin el chrome
    // del Shell (sidebar/navbars), para no tapar la vista de la cámara.
    path: 'coach-mode/ar/:drillId',
    loadComponent: () =>
      import('./features/coach-mode/ar-session/coach-ar-session').then((m) => m.CoachArSession),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard, welcomeFormGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'jugadores',
        loadComponent: () => import('./features/jugadores/jugadores').then((m) => m.Jugadores),
        canActivate: [adminGuard],
      },
      {
        // Ficha de seguimiento del atleta élite (categoría 1), con sus planillas en pestañas.
        path: 'jugadores/:id',
        loadComponent: () => import('./features/atleta/atleta-detalle').then((m) => m.AtletaDetalle),
        canActivate: [adminGuard],
      },
      {
        path: 'calendario',
        loadComponent: () => import('./features/calendario/calendario').then((m) => m.Calendario),
      },
      {
        path: 'coach-mode',
        loadComponent: () =>
          import('./features/coach-mode/config/coach-mode-config').then((m) => m.CoachModeConfig),
        canActivate: [adminGuard],
      },
      {
        path: 'modo-coach',
        loadComponent: () => import('./features/modo-coach/modo-coach').then((m) => m.ModoCoach),
        canActivate: [adminGuard],
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./features/ajustes/ajustes').then((m) => m.Ajustes),
      },
      { path: '', pathMatch: 'full', redirectTo: 'home' },
    ],
  },
  { path: '**', redirectTo: '' },
];
