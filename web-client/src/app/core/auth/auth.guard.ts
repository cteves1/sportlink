import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PlayersService } from '../players/players.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/** Protege rutas exclusivas del entrenador (ej. Jugadores) frente a accesos directos por URL de un jugador. */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.user()?.role !== 'player') {
    return true;
  }

  return router.createUrlTree(['/home']);
};

/**
 * Obliga a un jugador con el formulario de bienvenida pendiente a completarlo antes de
 * acceder a cualquier otra sección de la app (evita que lo salte navegando directo por URL).
 */
export const welcomeFormGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const playersService = inject(PlayersService);
  const router = inject(Router);

  const user = authService.user();
  if (user?.role === 'player' && user.athleteId !== undefined && playersService.isWelcomeFormPending(user.athleteId)) {
    return router.createUrlTree(['/bienvenida']);
  }

  return true;
};

/** Protege la ruta de bienvenida: solo la ve un jugador con el formulario pendiente. */
export const pendingWelcomeFormGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const playersService = inject(PlayersService);
  const router = inject(Router);

  const user = authService.user();
  if (user?.role === 'player' && user.athleteId !== undefined && playersService.isWelcomeFormPending(user.athleteId)) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
