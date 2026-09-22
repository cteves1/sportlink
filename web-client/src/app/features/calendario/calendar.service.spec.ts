import { TestBed } from '@angular/core/testing';
import { CalendarService } from './calendar.service';
import { TrainingSession } from './calendar.models';

const NEW_PLAYER = { id: 99, name: 'Lucía Benítez', category: 4 };

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarService);
  });

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
    expect(service.freeSlots(session)).toBe(session.capacity - service.confirmedCount(session));
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
    const freeBefore = service.freeSlots(session);

    service.cancelAttendance(session.id, confirmed.id);

    expect(service.freeSlots(reload(session.id))).toBe(freeBefore + 1);
  });
});
