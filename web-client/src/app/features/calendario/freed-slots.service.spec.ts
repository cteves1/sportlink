import { TestBed } from '@angular/core/testing';
import { FreedSlotsService } from './freed-slots.service';
import { Attendance, TrainingSession } from './calendar.models';

const ATTENDANCE: Attendance = {
  id: 3,
  playerId: 7,
  playerName: 'Benjamín Castro',
  category: 5,
  status: 'ausente',
  presence: null,
};

const SESSION: TrainingSession = {
  id: 42,
  date: new Date(2026, 0, 14),
  shiftLabel: 'Turno Mañana',
  startTime: '09:00',
  endTime: '13:00',
  capacity: null,
  attendances: [ATTENDANCE],
  templateId: 1,
};

describe('FreedSlotsService', () => {
  let service: FreedSlotsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FreedSlotsService);
  });

  it('registra el cupo liberado como pendiente con los datos del turno', () => {
    const event = service.register(SESSION, ATTENDANCE);

    expect(event.status).toBe('pendiente');
    expect(event.playerName).toBe('Benjamín Castro');
    expect(event.shiftLabel).toBe('Turno Mañana');
    expect(service.pending()).toHaveLength(1);
  });

  it('deja constancia de los destinatarios al notificar y sale de los pendientes', () => {
    const event = service.register(SESSION, ATTENDANCE);

    service.markNotified(event.id, [1, 2, 3]);

    const stored = service.find(event.id)!;
    expect(stored.status).toBe('avisado');
    expect(stored.notifiedPlayerIds).toEqual([1, 2, 3]);
    expect(stored.notifiedAt).not.toBeNull();
    expect(service.pending()).toHaveLength(0);
  });

  it('descartar el aviso lo quita de los pendientes sin borrar el registro', () => {
    const event = service.register(SESSION, ATTENDANCE);

    service.dismiss(event.id);

    expect(service.find(event.id)?.status).toBe('descartado');
    expect(service.pending()).toHaveLength(0);
  });

  it('elimina el evento cuando el cupo vuelve a ocuparse', () => {
    service.register(SESSION, ATTENDANCE);

    service.removeFor(SESSION.id, ATTENDANCE.id);

    expect(service.events()).toHaveLength(0);
  });

  it('persiste los eventos entre instancias rehidratando las fechas', () => {
    service.register(SESSION, ATTENDANCE);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(FreedSlotsService);

    expect(reloaded.pending()).toHaveLength(1);
    expect(reloaded.pending()[0].sessionDate).toBeInstanceOf(Date);
    expect(reloaded.pending()[0].createdAt).toBeInstanceOf(Date);
  });
});
