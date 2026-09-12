import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucidePencil, LucideTrophy, LucideX } from '@lucide/angular';
import { capitalize } from '../../../core/date/calendar-dates';
import { AnnualGoal, Competition } from '../atleta.models';
import { AtletaService } from '../atleta.service';

@Component({
  selector: 'app-atleta-calendario-anual',
  standalone: true,
  imports: [ReactiveFormsModule, LucidePencil, LucideTrophy, LucideX],
  templateUrl: './atleta-calendario-anual.html',
})
export class AtletaCalendarioAnual {
  private readonly fb = inject(FormBuilder);
  private readonly atletaService = inject(AtletaService);

  readonly athleteId = input.required<number>();

  protected readonly profile = computed(() => this.atletaService.profileFor(this.athleteId()));
  protected readonly year = computed(() => this.profile().year);
  protected readonly goals = computed(() =>
    [...this.profile().annualGoals].sort((a, b) => a.month - b.month),
  );

  /** Mes cuyo formulario de objetivos está abierto (`null` si no se está editando). */
  protected readonly editingMonth = signal<number | null>(null);

  private readonly currentMonth = new Date().getMonth();

  protected readonly form = this.fb.nonNullable.group({
    shortTerm: [''],
    mediumTerm: [''],
    longTerm: [''],
  });

  /** Torneos del año agrupados por mes, para mostrarlos como chips en cada tarjeta. */
  private readonly competitionsByMonth = computed(() => {
    const map = new Map<number, Competition[]>();
    for (const competition of this.profile().competitions) {
      const month = competition.date.getMonth();
      map.set(month, [...(map.get(month) ?? []), competition]);
    }
    return map;
  });

  protected competitionsOf(month: number): Competition[] {
    return this.competitionsByMonth().get(month) ?? [];
  }

  protected isCurrentMonth(month: number): boolean {
    return month === this.currentMonth;
  }

  protected monthLabel(month: number): string {
    return capitalize(
      new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(this.year(), month, 1)),
    );
  }

  protected startEditing(goal: AnnualGoal): void {
    this.form.setValue({
      shortTerm: goal.shortTerm,
      mediumTerm: goal.mediumTerm,
      longTerm: goal.longTerm,
    });
    this.editingMonth.set(goal.month);
  }

  protected cancelEditing(): void {
    this.editingMonth.set(null);
  }

  protected saveGoal(month: number): void {
    this.atletaService.updateAnnualGoal(this.athleteId(), month, this.form.getRawValue());
    this.editingMonth.set(null);
  }
}
