import { TestBed } from '@angular/core/testing';
import { CalendarService, ShiftTemplateInput } from './calendar.service';
import { FreedSlotsService } from './freed-slots.service';
import { ShiftTemplate, TrainingSession } from './calendar.models';
import { addDays, atMidnight, weekdayOf } from '../../core/date/calendar-dates';
import { PlayersService } from '../../core/players/players.service';

const NEW_PLAYER = { id: 99, name: 'Lucía Benítez', category: 4 };

/** Turno de madrugada: el horario no choca con los turnos de la semilla mock. */
const MORNING_SHIFT: ShiftTemplateInput = {
  label: 'Turno Madrugada',
  startTime: '07:00',
  endTime: '08:30',
  weekdays: [3],
  capacity: null,
  playerIds: [],
};

describe('CalendarService', () => {
  let service: CalendarService;
  let freedSlots: FreedSlotsService;
  const today = atMidnight(new Date());

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarService);
    freedSlots = TestBed.inject(FreedSlotsService);
  });

  /** Deja solo la plantilla indicada y materializa sus sesiones en el rango pedido. */
  function generate(input: ShiftTemplateInput, days: number): ShiftTemplate {
    service.templates.set([]);
    const template = service.addTemplate(input);
    service.ensureSessionsForRange(today, addDays(today, days - 1));
    return template;
  }

  function sessionsOf(templateId: number): TrainingSession[] {
    return service.sessions().filter((session) => session.templateId === templateId);
  }

  /** Primer turno con al menos un cupo libre, para probar la reserva. */
  function sessionWithFreeSlot(): TrainingSession {
    const session = service.sessions().find((candidate) => service.hasFreeSlot(candidate));
    expect(session).toBeDefined();
    return session!;
  }

  function reload(sessionId: number): TrainingSession {
    return service.sessions().find((candidate) => candidate.id === sessionId)!;
  }

  it('calcula los cupos libres descontando solo las reservas confirmadas', () => {
    const session = service.sessions()[0];
    expect(service.freeSlots(session)).toBe(
      (session.capacity ?? 0) - service.confirmedCount(session),
    );
  });

  it('reserva un cupo para un jugador que no estaba anotado', () => {
    const session = sessionWithFreeSlot();
    const before = service.confirmedCount(session);

    service.bookAttendance(session.id, NEW_PLAYER);

    const updated = reload(session.id);
    expect(service.confirmedCount(updated)).toBe(before + 1);
    expect(service.attendanceFor(updated, NEW_PLAYER.id)?.playerName).toBe(NEW_PLAYER.name);
  });

  it('no duplica la reserva si el jugador ya está confirmado', () => {
    const session = sessionWithFreeSlot();
    service.bookAttendance(session.id, NEW_PLAYER);
    const afterFirst = service.confirmedCount(reload(session.id));

    service.bookAttendance(session.id, NEW_PLAYER);

    expect(service.confirmedCount(reload(session.id))).toBe(afterFirst);
    expect(reload(session.id).attendances.filter((a) => a.playerId === NEW_PLAYER.id).length).toBe(
      1,
    );
  });

  it('restaura la reserva cancelada en lugar de crear una nueva', () => {
    const session = sessionWithFreeSlot();
    service.bookAttendance(session.id, NEW_PLAYER);
    const attendance = service.attendanceFor(reload(session.id), NEW_PLAYER.id)!;
    service.cancelAttendance(session.id, attendance.id);
    expect(service.attendanceFor(reload(session.id), NEW_PLAYER.id)?.status).toBe('ausente');

    service.bookAttendance(session.id, NEW_PLAYER);

    const updated = reload(session.id);
    expect(service.attendanceFor(updated, NEW_PLAYER.id)?.status).toBe('confirmado');
    expect(updated.attendances.filter((a) => a.playerId === NEW_PLAYER.id).length).toBe(1);
  });

  it('rechaza la reserva cuando el turno está completo', () => {
    // Se llena un turno reservando con jugadores ficticios hasta agotar los cupos.
    const session = sessionWithFreeSlot();
    let filler = 500;
    while (service.hasFreeSlot(reload(session.id))) {
      service.bookAttendance(session.id, { id: filler, name: `Relleno ${filler}`, category: 6 });
      filler++;
    }
    const full = reload(session.id);
    expect(service.freeSlots(full)).toBe(0);

    service.bookAttendance(session.id, NEW_PLAYER);

    expect(service.attendanceFor(reload(session.id), NEW_PLAYER.id)).toBeUndefined();
  });

  it('cancelar una reserva libera el cupo para otro jugador', () => {
    const session = sessionWithFreeSlot();
    const confirmed = session.attendances.find((a) => a.status === 'confirmado')!;
    const freeBefore = service.freeSlots(session) ?? 0;

    service.cancelAttendance(session.id, confirmed.id);

    expect(service.freeSlots(reload(session.id))).toBe(freeBefore + 1);
  });

  it('genera sesiones solo en los días de la jornada configurada', () => {
    const template = generate(MORNING_SHIFT, 14);

    const generated = sessionsOf(template.id);
    // En 14 días corridos cae exactamente dos veces el mismo día de la semana.
    expect(generated.length).toBe(2);
    expect(generated.every((session) => weekdayOf(session.date) === 3)).toBe(true);
    expect(generated.every((session) => session.startTime === '07:00')).toBe(true);
  });

  it('no duplica las sesiones al volver a navegar el mismo rango', () => {
    const template = generate(MORNING_SHIFT, 14);
    const firstPass = sessionsOf(template.id).length;

    service.ensureSessionsForRange(today, addDays(today, 13));

    expect(sessionsOf(template.id).length).toBe(firstPass);
  });

  it('no inventa turnos en el pasado', () => {
    service.templates.set([]);
    const template = service.addTemplate({ ...MORNING_SHIFT, weekdays: [1, 2, 3, 4, 5, 6, 7] });

    service.ensureSessionsForRange(addDays(today, -14), addDays(today, -1));

    expect(sessionsOf(template.id)).toHaveLength(0);
  });

  it('anota a los jugadores fijos del turno en cada sesión generada', () => {
    const athlete = TestBed.inject(PlayersService).addAthlete({
      firstName: 'Lucía',
      lastName: 'Benítez',
      category: 4,
      birthDate: new Date(2004, 4, 12),
      dominantHand: 'derecha',
      phone: '+54 11 5555-5555',
      playerType: 'regular',
      level: 'intermedio',
      paddleGrip: 'clasica',
      rubberForehand: 'liso',
      rubberBackhand: 'liso',
      playingStyle: 'ofensivo',
      club: null,
      specificGoal: null,
      trainingDays: [],
    });

    const template = generate(
      { ...MORNING_SHIFT, weekdays: [1, 2, 3, 4, 5, 6, 7], playerIds: [athlete.id] },
      2,
    );

    const generated = sessionsOf(template.id);
    expect(generated).toHaveLength(2);
    expect(
      generated.every(
        (session) =>
          session.attendances.length === 1 &&
          session.attendances[0].playerName === 'Lucía Benítez' &&
          session.attendances[0].status === 'confirmado',
      ),
    ).toBe(true);
  });

  it('un turno sin tope nunca se completa', () => {
    const template = generate({ ...MORNING_SHIFT, weekdays: [1, 2, 3, 4, 5, 6, 7] }, 1);
    const session = sessionsOf(template.id)[0];
    expect(service.freeSlots(session)).toBeNull();

    for (let i = 0; i < 10; i++) {
      service.bookAttendance(session.id, { id: 700 + i, name: `Jugador ${i}`, category: 5 });
    }

    const updated = reload(session.id);
    expect(service.confirmedCount(updated)).toBe(10);
    expect(service.hasFreeSlot(updated)).toBe(true);
  });

  it('eliminar un turno borra las sesiones futuras y conserva el historial pasado', () => {
    const template = generate({ ...MORNING_SHIFT, weekdays: [1, 2, 3, 4, 5, 6, 7] }, 3);
    const past: TrainingSession = {
      ...sessionsOf(template.id)[0],
      id: 9000,
      date: addDays(today, -7),
    };
    service.sessions.update((sessions) => [...sessions, past]);

    service.deleteTemplate(template.id);

    expect(service.templates()).toHaveLength(0);
    const remaining = sessionsOf(template.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(past.id);
  });

  it('editar un turno regenera las sesiones futuras con el horario nuevo', () => {
    const template = generate({ ...MORNING_SHIFT, weekdays: [1, 2, 3, 4, 5, 6, 7] }, 3);
    expect(sessionsOf(template.id)).toHaveLength(3);

    service.updateTemplate(template.id, {
      ...MORNING_SHIFT,
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      startTime: '06:00',
      endTime: '07:30',
    });
    expect(sessionsOf(template.id)).toHaveLength(0);

    service.ensureSessionsForRange(today, addDays(today, 2));
    const regenerated = sessionsOf(template.id);
    expect(regenerated).toHaveLength(3);
    expect(regenerated.every((session) => session.startTime === '06:00')).toBe(true);
  });

  it('cancelar registra un cupo liberado pendiente y deshacerlo lo quita', () => {
    const session = sessionWithFreeSlot();
    const confirmed = session.attendances.find((a) => a.status === 'confirmado')!;

    const event = service.cancelAttendance(session.id, confirmed.id);

    expect(event).not.toBeNull();
    expect(event!.playerName).toBe(confirmed.playerName);
    expect(freedSlots.pending().map((pending) => pending.id)).toContain(event!.id);

    service.restoreAttendance(session.id, confirmed.id);

    expect(freedSlots.pending()).toHaveLength(0);
  });
});
