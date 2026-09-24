import { TestBed } from '@angular/core/testing';
import { AtletaService } from './atleta.service';
import { MacrocycleInput } from './periodization';

const ELITE_ATHLETE_ID = 1;

const MACROCYCLE: MacrocycleInput = {
  name: 'Temporada 2026',
  startDate: new Date(2026, 2, 2),
  endDate: new Date(2026, 11, 6),
  targetEvent: 'Campeonato Argentino',
  targetDate: new Date(2026, 9, 17),
  goal: 'Pico de forma en octubre',
  weeksPerMesocycle: 4,
};

describe('AtletaService', () => {
  let service: AtletaService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtletaService);
  });

  it('genera la misma ficha en lecturas sucesivas (mock determinístico)', () => {
    const first = service.profileFor(ELITE_ATHLETE_ID);
    const second = service.profileFor(ELITE_ATHLETE_ID);

    expect(first.attendance.length).toBe(second.attendance.length);
    expect(first.attendance.map((day) => day.status)).toEqual(
      second.attendance.map((day) => day.status),
    );
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

    const goal = service
      .profileFor(ELITE_ATHLETE_ID)
      .annualGoals.find((entry) => entry.month === 8);
    expect(goal?.shortTerm).toBe('Ganar la 3.ª fecha');
    expect(goal?.longTerm).toBe('Selección juvenil');
  });

  it('la ficha arranca sin planificación por ciclos', () => {
    expect(service.profileFor(ELITE_ATHLETE_ID).macrocycles).toEqual([]);
  });

  it('crea el macrociclo con sus mesociclos y microciclos', () => {
    const created = service.createMacrocycle(ELITE_ATHLETE_ID, MACROCYCLE);

    const stored = service.profileFor(ELITE_ATHLETE_ID).macrocycles;
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(created.id);
    expect(stored[0].targetEvent).toBe('Campeonato Argentino');
    expect(stored[0].mesocycles.length).toBeGreaterThan(1);
    expect(stored[0].mesocycles[0].microcycle).toHaveLength(7);
  });

  it('ajusta la fase de un mesociclo sin tocar los demás', () => {
    const macrocycle = service.createMacrocycle(ELITE_ATHLETE_ID, MACROCYCLE);
    const [first, second] = macrocycle.mesocycles;

    service.updateMesocycle(ELITE_ATHLETE_ID, macrocycle.id, first.id, {
      phase: 'precompetitivo',
      goal: 'Simular competencia',
    });

    const stored = service.profileFor(ELITE_ATHLETE_ID).macrocycles[0].mesocycles;
    expect(stored[0].phase).toBe('precompetitivo');
    expect(stored[0].goal).toBe('Simular competencia');
    expect(stored[1].phase).toBe(second.phase);
  });

  it('edita un día del microciclo y deja el resto de la semana igual', () => {
    const macrocycle = service.createMacrocycle(ELITE_ATHLETE_ID, MACROCYCLE);
    const mesocycle = macrocycle.mesocycles[0];

    service.updateMicrocycleDay(ELITE_ATHLETE_ID, macrocycle.id, mesocycle.id, 2, {
      load: 'descanso',
      workType: null,
      goal: 'Descanso extra por viaje',
    });

    const stored = service.profileFor(ELITE_ATHLETE_ID).macrocycles[0].mesocycles[0].microcycle;
    const tuesday = stored.find((day) => day.weekday === 2)!;
    expect(tuesday.load).toBe('descanso');
    expect(tuesday.workType).toBeNull();
    expect(stored.filter((day) => day.weekday !== 2)).toEqual(
      mesocycle.microcycle.filter((day) => day.weekday !== 2),
    );
  });

  it('elimina el macrociclo completo', () => {
    const macrocycle = service.createMacrocycle(ELITE_ATHLETE_ID, MACROCYCLE);

    service.deleteMacrocycle(ELITE_ATHLETE_ID, macrocycle.id);

    expect(service.profileFor(ELITE_ATHLETE_ID).macrocycles).toEqual([]);
  });

  it('rehidrata las fechas de los ciclos guardados en localStorage', () => {
    service.createMacrocycle(ELITE_ATHLETE_ID, MACROCYCLE);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(AtletaService).profileFor(ELITE_ATHLETE_ID).macrocycles[0];

    expect(reloaded.startDate).toBeInstanceOf(Date);
    expect(reloaded.targetDate).toBeInstanceOf(Date);
    expect(reloaded.mesocycles[0].startDate).toBeInstanceOf(Date);
  });
});
