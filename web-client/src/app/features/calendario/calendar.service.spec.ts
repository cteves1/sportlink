import { TestBed } from '@angular/core/testing';
import { addDays, atMidnight, startOfWeek, weekdayOf } from '../../core/date/calendar-dates';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { fakeSupabaseService, FakeResolver } from '../../core/supabase/supabase-testing';
import { CalendarService, ShiftTemplateInput } from './calendar.service';
import { FreedSlotsService } from './freed-slots.service';
import { ShiftTemplate } from './calendar.models';

const MORNING_SHIFT: ShiftTemplateInput = {
  label: 'Turno Madrugada',
  startTime: '07:00',
  endTime: '08:30',
  weekdays: [3],
  capacity: null,
  playerIds: [],
};

function dbTemplateFromInput(id: number, input: ShiftTemplateInput) {
  return {
    id,
    label: input.label,
    start_time: input.startTime,
    end_time: input.endTime,
    weekdays: input.weekdays,
    capacity: input.capacity,
    player_ids: input.playerIds,
    created_by: 'coach-uuid',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function dbSession(id: number, template: ShiftTemplate, date: Date, attendances: unknown[] = []) {
  return {
    id,
    session_date: date.toISOString().split('T')[0],
    shift_label: template.label,
    start_time: template.startTime,
    end_time: template.endTime,
    capacity: template.capacity,
    template_id: template.id,
    session_attendances: attendances,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('CalendarService', () => {
  let service: CalendarService;
  let resolverCalls: { table: string; operation: string; payload: unknown; filters: unknown[] }[];

  beforeEach(() => {
    resolverCalls = [];
  });

  function configureService(resolver: FakeResolver) {
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: fakeSupabaseService(resolver) },
        FreedSlotsService,
      ],
    });
    service = TestBed.inject(CalendarService);
  }

  it('crea una plantilla y la agrega al signal de plantillas', async () => {
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'shift_templates' && operation === 'insert') {
        return { data: dbTemplateFromInput(1, payload as ShiftTemplateInput), error: null };
      }
      return { data: null, error: null };
    });

    const template = await service.addTemplate(MORNING_SHIFT);

    expect(template).not.toBeNull();
    expect(service.templates()).toContainEqual(template);
  });

  it('genera sesiones futuras a partir de una plantilla', async () => {
    // Buscamos un miércoles dentro de las próximas 6 semanas.
    const nextWednesday = atMidnight(new Date());
    while (weekdayOf(nextWednesday) !== 3) {
      nextWednesday.setDate(nextWednesday.getDate() + 1);
    }
    const from = startOfWeek(nextWednesday);
    const to = addDays(from, 41);

    let sessionsQueryCount = 0;

    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'shift_templates' && operation === 'insert') {
        return { data: dbTemplateFromInput(1, payload as ShiftTemplateInput), error: null };
      }
      if (table === 'training_sessions' && operation === 'select') {
        sessionsQueryCount++;
        if (sessionsQueryCount === 1) return { data: [], error: null };
        const template = service.templates()[0];
        return {
          data: template ? [dbSession(100, template, nextWednesday)] : [],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await service.addTemplate(MORNING_SHIFT);
    await service.ensureSessionsForRange(from, to);

    const sessions = service.sessions();
    expect(sessions.length).toBeGreaterThan(0);
    const wednesdaySession = sessions.find((s) => s.shiftLabel === MORNING_SHIFT.label);
    expect(wednesdaySession).toBeDefined();
    expect(wednesdaySession?.templateId).toBe(1);
  });

  it('crea un turno puntual y lo refleja en el signal de sesiones', async () => {
    const date = addDays(atMidnight(new Date()), 1);
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'training_sessions' && operation === 'insert') {
        const data = payload as Record<string, unknown>;
        return {
          data: {
            id: 50,
            session_date: data['session_date'] as string,
            shift_label: data['shift_label'] as string,
            start_time: data['start_time'] as string,
            end_time: data['end_time'] as string,
            capacity: data['capacity'] as number | null,
            template_id: null,
            session_attendances: [],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const created = await service.addSessionOn(date, {
      label: 'Particular',
      startTime: '17:00',
      endTime: '18:00',
      capacity: 1,
      playerIds: [],
    });

    expect(created).not.toBeNull();
    expect(created?.templateId).toBeNull();
    expect(created?.capacity).toBe(1);
    expect(service.sessions()).toContainEqual(created);
  });

  it('elimina un turno puntual del signal de sesiones', async () => {
    const date = addDays(atMidnight(new Date()), 1);
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'training_sessions' && operation === 'insert') {
        return {
          data: {
            id: 50,
            session_date: date.toISOString().split('T')[0],
            shift_label: 'Particular',
            start_time: '17:00',
            end_time: '18:00',
            capacity: 1,
            template_id: null,
            session_attendances: [],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const created = await service.addSessionOn(date, {
      label: 'Particular',
      startTime: '17:00',
      endTime: '18:00',
      capacity: 1,
      playerIds: [],
    });

    await service.removeSession(created!.id);

    expect(service.sessions().some((s) => s.id === created!.id)).toBe(false);
  });

  it('reserva un cupo para un jugador en una sesión', async () => {
    const date = addDays(atMidnight(new Date()), 1);
    const player = { id: 1, name: 'Jugador Test', category: 4 };

    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'training_sessions' && operation === 'select') {
        return {
          data: [
            {
              id: 60,
              session_date: date.toISOString().split('T')[0],
              shift_label: 'Turno',
              start_time: '09:00',
              end_time: '10:00',
              capacity: 6,
              template_id: null,
              session_attendances: [
                {
                  id: 200,
                  athlete_id: player.id,
                  status: 'confirmado',
                  presence: null,
                  athlete: {
                    first_name: 'Jugador',
                    last_name: 'Test',
                    category: player.category,
                  },
                },
              ],
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await service.loadSessionsForRange(date, date);
    await service.bookAttendance(60, player);

    const session = service.sessions().find((s) => s.id === 60);
    expect(session?.attendances.some((a) => a.playerId === player.id)).toBe(true);
  });

  it('registra la presencia de un jugador en una sesión', async () => {
    const date = addDays(atMidnight(new Date()), 1);

    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'training_sessions' && operation === 'select') {
        return {
          data: [
            {
              id: 70,
              session_date: date.toISOString().split('T')[0],
              shift_label: 'Turno',
              start_time: '09:00',
              end_time: '10:00',
              capacity: 6,
              template_id: null,
              session_attendances: [
                {
                  id: 300,
                  athlete_id: 1,
                  status: 'confirmado',
                  presence: 'presente',
                  athlete: { first_name: 'Jugador', last_name: 'Test', category: 4 },
                },
              ],
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await service.loadSessionsForRange(date, date);
    await service.setPresence(70, 300, 'ausente');

    const attendance = service.sessions().find((s) => s.id === 70)?.attendances[0];
    expect(attendance?.presence).toBe('ausente');
  });
});
