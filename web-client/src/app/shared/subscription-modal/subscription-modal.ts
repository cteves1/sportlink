import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LucideX } from '@lucide/angular';
import { Athlete } from '../../core/players/players.service';
import { PaymentsService, SubscriptionSummary } from '../../core/payments/payments.service';

@Component({
  selector: 'app-subscription-modal',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, LucideX],
  templateUrl: './subscription-modal.html',
})
export class SubscriptionModal implements OnInit {
  private readonly paymentsService = inject(PaymentsService);

  athlete = input.required<Athlete>();
  closed = output<void>();

  protected readonly loading = signal(true);
  protected readonly summary = signal<SubscriptionSummary | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadSummary();
  }

  protected async loadSummary(): Promise<void> {
    this.loading.set(true);
    const payments = await this.paymentsService.getPaymentsForAthlete(this.athlete().id);
    const summary = this.paymentsService.buildSummary(this.athlete().id, payments);
    this.summary.set(summary);
    this.loading.set(false);
  }

  protected async markPaid(): Promise<void> {
    const now = new Date();
    const yearMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    await this.paymentsService.savePayment(this.athlete().id, yearMonth, now);
    await this.loadSummary();
  }

  protected formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  protected close(): void {
    this.closed.emit();
  }
}
