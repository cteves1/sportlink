import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { SupabaseService } from './core/supabase/supabase.service';
import { PlayersService } from './core/players/players.service';
import { CalendarService } from './features/calendario/calendar.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAppInitializer(async () => {
      const supabase = inject(SupabaseService);
      const players = inject(PlayersService);
      const calendar = inject(CalendarService);
      await supabase.initialize();
      await Promise.all([players.loadAthletes(), calendar.loadTemplates()]);
    }),
  ]
};
