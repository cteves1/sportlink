import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface Payment {
  id: number;
  athleteId: number;
  yearMonth: Date;
  paidAt: Date | null;
  amount: number | null;
  dueDate: Date;
}

export interface SubscriptionSummary {
  athleteId: number;
  currentMonthLabel: string;
  paid: boolean;
  paidAt: Date | null;
  dueDate: Date;
  isUpToDate: boolean;
  daysLate: number;
  pendingMonths: PendingMonth[];
}

export interface PendingMonth {
  label: string;
  dueDate: Date;
  daysLate: number;
}

interface DbPayment {
  id: number;
  athlete_id: number;
  year_month: string;
  paid_at: string | null;
  amount: number | null;
  due_date: string;
}

function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
}

function parseDbDate(value: string): Date {
  const parsed = new Date(value);
  parsed.setMinutes(parsed.getMinutes() + parsed.getTimezoneOffset());
  return parsed;
}

function fromDbPayment(row: DbPayment): Payment {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    yearMonth: parseDbDate(row.year_month),
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    amount: row.amount,
    dueDate: parseDbDate(row.due_date),
  };
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly _payments = signal<Payment[]>([]);

  readonly payments = this._payments.asReadonly();

  async loadPayments(): Promise<void> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .order('year_month', { ascending: false });

    if (error) {
      console.error('Error cargando pagos:', error);
      return;
    }

    this._payments.set((data ?? []).map((row) => fromDbPayment(row as DbPayment)));
  }

  async getPaymentsForAthlete(athleteId: number): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('year_month', { ascending: false });

    if (error) {
      console.error('Error cargando pagos del atleta:', error);
      return [];
    }

    return (data ?? []).map((row) => fromDbPayment(row as DbPayment));
  }

  buildSummary(athleteId: number, payments: Payment[]): SubscriptionSummary {
    const now = new Date();
    const currentMonth = firstDayOfMonth(now);
    const currentDueDate = addDays(currentMonth, 9); // pagos del 1 al 10

    const currentPayment = payments.find((p) => sameMonth(p.yearMonth, currentMonth));
    const paid = !!currentPayment?.paidAt;
    const paidAt = currentPayment?.paidAt ?? null;

    let daysLate = 0;
    if (paidAt && paidAt.getTime() > currentDueDate.getTime()) {
      daysLate = daysBetween(currentDueDate, paidAt);
    } else if (!paid && now.getTime() > currentDueDate.getTime()) {
      daysLate = daysBetween(currentDueDate, now);
    }

    const pendingMonths: PendingMonth[] = [];

    // Meses anteriores sin pago.
    for (let i = 1; i <= 12; i++) {
      const monthDate = firstDayOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
      const dueDate = addDays(monthDate, 9);
      const payment = payments.find((p) => sameMonth(p.yearMonth, monthDate));

      if (!payment || !payment.paidAt) {
        const lateDays = now.getTime() > dueDate.getTime() ? daysBetween(dueDate, now) : 0;
        pendingMonths.push({ label: formatMonth(monthDate), dueDate, daysLate: lateDays });
      }
    }

    // Mes corriente si no está pago y ya venció.
    if (!paid && now.getTime() > currentDueDate.getTime()) {
      pendingMonths.unshift({ label: formatMonth(currentMonth), dueDate: currentDueDate, daysLate });
    }

    const isUpToDate = pendingMonths.length === 0;

    return {
      athleteId,
      currentMonthLabel: formatMonth(currentMonth),
      paid,
      paidAt,
      dueDate: currentDueDate,
      isUpToDate,
      daysLate,
      pendingMonths,
    };
  }

  async savePayment(
    athleteId: number,
    yearMonth: Date,
    paidAt: Date,
    amount?: number,
  ): Promise<void> {
    const dueDate = addDays(yearMonth, 9);
    const { error } = await this.supabase.from('payments').upsert(
      {
        athlete_id: athleteId,
        year_month: yearMonth.toISOString().split('T')[0],
        paid_at: paidAt.toISOString(),
        amount: amount ?? null,
        due_date: dueDate.toISOString().split('T')[0],
      },
      { onConflict: 'athlete_id,year_month' },
    );

    if (error) {
      console.error('Error guardando pago:', error);
    }
  }
}
