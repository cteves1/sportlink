import { Injectable, computed, inject, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { FreedSlotEvent, FreedSlotStatus } from './calendar.models';

interface DbFreedSlot {
  id: number;
  session_id: number;
  attendance_id: number | null;
  athlete_id: number;
  player_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  shift_label: string;
  status: FreedSlotStatus;
  notified_player_ids: number[];
  notified_at: string | null;
  freed_at: string;
}

@Injectable({ providedIn: 'root' })
export class FreedSlotsService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly _events = signal<FreedSlotEvent[]>([]);
  private realtimeChannel: RealtimeChannel | null = null;
  readonly events = this._events.asReadonly();

  /** Cupos liberados de los que el entrenador todavía no decidió si avisar, del más reciente al más antiguo. */
  readonly pending = computed<FreedSlotEvent[]>(() =>
    this._events()
      .filter((event) => event.status === 'pendiente')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  );

  subscribeToChanges(): void {
    if (this.realtimeChannel) return;

    this.realtimeChannel = this.supabase
      .channel('freed_slots_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'freed_slots' },
        () => {
          void this.loadEvents();
        },
      )
      .subscribe();
  }

  unsubscribe(): void {
    this.realtimeChannel?.unsubscribe();
    this.realtimeChannel = null;
  }

  async loadEvents(): Promise<void> {
    const { data, error } = await this.supabase
      .from('freed_slots')
      .select('*')
      .order('freed_at', { ascending: false })
      .returns<DbFreedSlot[]>();

    if (error) {
      console.error('Error cargando cupos liberados:', error);
      return;
    }

    this._events.set((data ?? []).map((row) => this.mapFromDb(row)));
  }

  /** Deja constancia de a quiénes se avisó del cupo liberado. */
  async markNotified(eventId: number, playerIds: readonly number[]): Promise<void> {
    const { error } = await this.supabase
      .from('freed_slots')
      .update({
        status: 'avisado',
        notified_player_ids: [...playerIds],
        notified_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error marcando aviso:', error);
      return;
    }

    this.patch(eventId, { status: 'avisado', notifiedPlayerIds: [...playerIds], notifiedAt: new Date() });
  }

  /** El entrenador decide no avisar: el cupo sale de la bandeja de pendientes. */
  async dismiss(eventId: number): Promise<void> {
    const { error } = await this.supabase
      .from('freed_slots')
      .update({ status: 'descartado' })
      .eq('id', eventId);

    if (error) {
      console.error('Error descartando cupo:', error);
      return;
    }

    this.patch(eventId, { status: 'descartado' });
  }

  private patch(eventId: number, changes: Partial<FreedSlotEvent>): void {
    this._events.update((events) =>
      events.map((event) => (event.id === eventId ? { ...event, ...changes } : event)),
    );
  }

  private mapFromDb(row: DbFreedSlot): FreedSlotEvent {
    return {
      id: row.id,
      sessionId: row.session_id,
      attendanceId: row.attendance_id ?? row.id,
      playerId: row.athlete_id,
      playerName: row.player_name,
      sessionDate: new Date(`${row.session_date}T00:00:00`),
      shiftLabel: row.shift_label,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: new Date(row.freed_at),
      status: row.status,
      notifiedPlayerIds: row.notified_player_ids ?? [],
      notifiedAt: row.notified_at ? new Date(row.notified_at) : null,
    };
  }
}
