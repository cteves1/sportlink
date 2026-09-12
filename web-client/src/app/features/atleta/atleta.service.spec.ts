import { TestBed } from '@angular/core/testing';
import { AtletaService } from './atleta.service';

const ELITE_ATHLETE_ID = 1;

describe('AtletaService', () => {
  let service: AtletaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtletaService);
  });

  it('genera la misma ficha en lecturas sucesivas (mock determinístico)', () => {
    const first = service.profileFor(ELITE_ATHLETE_ID);
    const second = service.profileFor(ELITE_ATHLETE_ID);

    expect(first.attendance.length).toBe(second.attendance.length);
    expect(first.attendance.map((day) => day.status)).toEqual(second.attendance.map((day) => day.status));
  });

  it('registra asistencia desde marzo hasta diciembre', () => {
    const months = new Set(
      service.profileFor(ELITE_ATHLETE_ID).attendance.map((day) => Number(day.dateKey.slice(5, 7))),
    );

    expect(Math.min(...months)).toBe(3);
    expect(Math.max(...months)).toBe(12);
  });

  it('no planifica entrenamiento los domingos', () => {
    const sundays = service
      .profileFor(ELITE_ATHLETE_ID)
      .attendance.filter((day) => new Date(`${day.dateKey}T00:00:00`).getDay() === 0)
      .filter((day) => day.status !== 'competencia');

    expect(sundays).toEqual([]);
  });

  it('rota el estado de un día y conserva el cambio', () => {
    const day = service.profileFor(ELITE_ATHLETE_ID).attendance[0];

    service.setAttendanceStatus(ELITE_ATHLETE_ID, day.dateKey, 'presente');
    service.cycleAttendanceStatus(ELITE_ATHLETE_ID, day.dateKey);

    const updated = service
      .profileFor(ELITE_ATHLETE_ID)
      .attendance.find((candidate) => candidate.dateKey === day.dateKey);
    expect(updated?.status).toBe('ausente');
  });

  it('guarda los objetivos editados de un mes del calendario anual', () => {
    service.updateAnnualGoal(ELITE_ATHLETE_ID, 8, {
      shortTerm: 'Ganar la 3.ª fecha',
      mediumTerm: 'Top 4 nacional',
      longTerm: 'Selección juvenil',
    });

    const goal = service.profileFor(ELITE_ATHLETE_ID).annualGoals.find((entry) => entry.month === 8);
    expect(goal?.shortTerm).toBe('Ganar la 3.ª fecha');
    expect(goal?.longTerm).toBe('Selección juvenil');
  });
});
