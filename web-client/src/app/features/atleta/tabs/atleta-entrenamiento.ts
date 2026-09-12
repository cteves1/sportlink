import { Component, computed, inject, input } from '@angular/core';
import { LucideClock, LucideDumbbell, LucideMapPin } from '@lucide/angular';
import { AtletaService } from '../atleta.service';
import { TrainingActivity, TrainingDayPlan, TrainingLocation } from '../atleta.models';

const WEEKDAY_NAMES: Record<TrainingDayPlan['weekday'], string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const LOCATION_LABELS: Record<TrainingLocation, string> = {
  cenard: 'CENARD',
  club: 'Club',
  particular: 'Particular',
  gimnasio: 'Gimnasio',
  casa: 'Casa',
};

@Component({
  selector: 'app-atleta-entrenamiento',
  standalone: true,
  imports: [LucideClock, LucideDumbbell, LucideMapPin],
  templateUrl: './atleta-entrenamiento.html',
})
export class AtletaEntrenamiento {
  private readonly atletaService = inject(AtletaService);

  readonly athleteId = input.required<number>();

  protected readonly weeklyPlan = computed(() => this.atletaService.profileFor(this.athleteId()).weeklyPlan);

  /** Minutos totales de la semana (sumando las repeticiones de cada actividad). */
  protected readonly weeklyMinutes = computed(() =>
    this.weeklyPlan().reduce((total, day) => total + this.dayMinutes(day), 0),
  );

  protected readonly weeklySessions = computed(() =>
    this.weeklyPlan().reduce(
      (total, day) => total + day.activities.reduce((sum, activity) => sum + activity.sessions, 0),
      0,
    ),
  );

  protected readonly activeDays = computed(
    () => this.weeklyPlan().filter((day) => day.activities.length > 0).length,
  );

  /** Promedio de minutos por día con actividad (redondeado a minutos enteros). */
  protected readonly averageDailyMinutes = computed(() => {
    const days = this.activeDays();
    return days === 0 ? 0 : Math.round(this.weeklyMinutes() / days);
  });

  /** Minutos semanales agrupados por ubicación, para el resumen de carga. */
  protected readonly minutesByLocation = computed(() => {
    const totals = new Map<TrainingLocation, number>();
    for (const day of this.weeklyPlan()) {
      for (const activity of day.activities) {
        const minutes = activity.durationMin * activity.sessions;
        totals.set(activity.location, (totals.get(activity.location) ?? 0) + minutes);
      }
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  });

  protected dayMinutes(day: TrainingDayPlan): number {
    return day.activities.reduce((sum, activity) => sum + activity.durationMin * activity.sessions, 0);
  }

  protected weekdayName(weekday: TrainingDayPlan['weekday']): string {
    return WEEKDAY_NAMES[weekday];
  }

  protected locationLabel(location: TrainingLocation): string {
    return LOCATION_LABELS[location];
  }

  /** Texto de la actividad, ej.: "CENARD x2 · 2 h" o "Saques · 45 min". */
  protected activityLabel(activity: TrainingActivity): string {
    const repetitions = activity.sessions > 1 ? ` x${activity.sessions}` : '';
    return `${activity.label}${repetitions}`;
  }

  /** Formatea minutos como "2 h 30 min", "2 h" o "45 min". */
  protected formatDuration(minutes: number): string {
    if (minutes === 0) return '—';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest} min`;
    if (rest === 0) return `${hours} h`;
    return `${hours} h ${rest} min`;
  }

  /** Clases del chip de ubicación: destaca CENARD y las particulares del entrenador local. */
  protected locationChipClasses(location: TrainingLocation): string {
    switch (location) {
      case 'cenard':
        return 'bg-brand-100 text-brand-700';
      case 'particular':
        return 'bg-amber-100 text-amber-800';
      case 'gimnasio':
        return 'bg-blue-100 text-blue-700';
      case 'club':
        return 'bg-purple-100 text-purple-700';
      case 'casa':
        return 'bg-gray-100 text-gray-600';
    }
  }
}
