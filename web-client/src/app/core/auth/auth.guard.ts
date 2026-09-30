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

/** Protege rutas exclusivas del entrenador frente a accesos directos por URL de un jugador. */
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

/** Protege la ruta de bienvenida: solo la ve un jugador con la cuenta activada y el formulario pendiente. */
export const pendingWelcomeFormGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const playersService = inject(PlayersService);
  const router = inject(Router);

  const user = authService.user();
  if (user?.role !== 'player' || user.athleteId === undefined) {
    return router.createUrlTree(['/home']);
  }

  if (playersService.isSetupPending(user.athleteId)) {
    return router.createUrlTree(['/primer-ingreso']);
  }

  if (playersService.isWelcomeFormPending(user.athleteId)) {
    return true;
  }

  return router.createUrlTree(['/home']);
};

/**
 * Obliga a un jugador con el primer login pendiente a completar la pantalla de
 * activación de cuenta antes de acceder al resto de la app.
 */
export const firstLoginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const playersService = inject(PlayersService);
  const router = inject(Router);

  const user = authService.user();
  if (user?.role === 'player' && user.athleteId !== undefined && playersService.isSetupPending(user.athleteId)) {
    return router.createUrlTree(['/primer-ingreso']);
  }

  return true;
};

/** Protege la ruta de primer ingreso: solo la ve un jugador con la activación pendiente. */
export const pendingFirstLoginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const playersService = inject(PlayersService);
  const router = inject(Router);

  const user = authService.user();
  if (user?.role === 'player' && user.athleteId !== undefined && playersService.isSetupPending(user.athleteId)) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
