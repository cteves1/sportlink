import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { fakeSupabaseService, FakeResolver } from '../../core/supabase/supabase-testing';
import { FreedSlotsService } from './freed-slots.service';

function dbFreedSlot(id: number, status: 'pendiente' | 'avisado' | 'descartado' = 'pendiente') {
  return {
    id,
    session_id: 1,
    attendance_id: 10,
    athlete_id: 2,
    player_name: 'Jugador Test',
    session_date: '2026-01-15',
    start_time: '17:00',
    end_time: '18:00',
    shift_label: 'Turno Test',
    status,
    notified_player_ids: [] as number[],
    notified_at: status === 'avisado' ? '2026-01-10T10:00:00Z' : null,
    freed_at: '2026-01-10T09:00:00Z',
  };
}

describe('FreedSlotsService', () => {
  let service: FreedSlotsService;
  let resolverCalls: { table: string; operation: string; payload: unknown; filters: unknown[] }[];

  beforeEach(() => {
    resolverCalls = [];
  });

  function configureService(resolver: FakeResolver) {
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(resolver) }],
    });
    service = TestBed.inject(FreedSlotsService);
  }

  it('carga los cupos liberados pendientes', async () => {
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'freed_slots' && operation === 'select') {
        return { data: [dbFreedSlot(1), dbFreedSlot(2, 'descartado')], error: null };
      }
      return { data: null, error: null };
    });

    await service.loadEvents();

    expect(service.pending()).toHaveLength(1);
    expect(service.pending()[0].id).toBe(1);
  });

  it('marca un cupo como avisado con los destinatarios indicados', async () => {
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'freed_slots' && operation === 'select') {
        return { data: [dbFreedSlot(1)], error: null };
      }
      return { data: null, error: null };
    });

    await service.loadEvents();
    await service.markNotified(1, [3, 4]);

    const event = service.events().find((e) => e.id === 1);
    expect(event?.status).toBe('avisado');
    expect(event?.notifiedPlayerIds).toEqual([3, 4]);
    expect(event?.notifiedAt).not.toBeNull();
  });

  it('descarta un cupo liberado', async () => {
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'freed_slots' && operation === 'select') {
        return { data: [dbFreedSlot(1)], error: null };
      }
      return { data: null, error: null };
    });

    await service.loadEvents();
    await service.dismiss(1);

    const event = service.events().find((e) => e.id === 1);
    expect(event?.status).toBe('descartado');
  });
});
