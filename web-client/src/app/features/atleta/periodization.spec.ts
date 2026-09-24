import { MacrocycleInput, buildMacrocycle, weeksBetween } from './periodization';
import { MesocyclePhase } from './atleta.models';

/** Macrociclo de 9 meses con el torneo objetivo en octubre y descarga hasta diciembre. */
function input(overrides: Partial<MacrocycleInput> = {}): MacrocycleInput {
  return {
    name: 'Temporada 2026',
    startDate: new Date(2026, 2, 2), // lunes 2 de marzo
    endDate: new Date(2026, 11, 6), // 6 de diciembre
    targetEvent: 'Campeonato Argentino',
    targetDate: new Date(2026, 9, 17), // 17 de octubre
    goal: 'Llegar en pico de forma al Argentino',
    weeksPerMesocycle: 4,
    ...overrides,
  };
}

function phasesOf(macrocycleInput: MacrocycleInput): MesocyclePhase[] {
  return buildMacrocycle(1, macrocycleInput).mesocycles.map((mesocycle) => mesocycle.phase);
}

describe('buildMacrocycle', () => {
  it('divide el macrociclo en mesociclos de la cantidad de semanas pedida', () => {
    const macrocycle = buildMacrocycle(1, input());

    expect(macrocycle.mesocycles.length).toBeGreaterThan(1);
    // Todos menos el último abarcan las 4 semanas completas.
    for (const mesocycle of macrocycle.mesocycles.slice(0, -1)) {
      expect(weeksBetween(mesocycle.startDate, mesocycle.endDate)).toBe(4);
    }
  });

  it('cubre el período sin huecos ni solapamientos', () => {
    const macrocycle = buildMacrocycle(1, input());
    const mesocycles = macrocycle.mesocycles;

    expect(mesocycles[0].startDate.getTime()).toBeLessThanOrEqual(macrocycle.startDate.getTime());
    expect(mesocycles.at(-1)!.endDate.getTime()).toBe(macrocycle.endDate.getTime());

    for (let i = 1; i < mesocycles.length; i++) {
      const gapDays =
        (mesocycles[i].startDate.getTime() - mesocycles[i - 1].endDate.getTime()) / 86_400_000;
      expect(gapDays).toBe(1);
    }
  });

  it('ubica el bloque competitivo donde cae la fecha del objetivo', () => {
    const macrocycle = buildMacrocycle(1, input());
    const target = macrocycle.targetDate!;

    const competitive = macrocycle.mesocycles.find(
      (mesocycle) => mesocycle.phase === 'competitivo',
    );
    expect(competitive).toBeDefined();
    expect(target.getTime()).toBeGreaterThanOrEqual(competitive!.startDate.getTime());
    expect(target.getTime()).toBeLessThanOrEqual(competitive!.endDate.getTime());
  });

  it('ordena las fases de lo general a lo específico y deja la transición al final', () => {
    const phases = phasesOf(input());

    expect(phases[0]).toBe('preparatorio-general');
    expect(phases).toContain('preparatorio-especifico');
    // El precompetitivo va inmediatamente antes del competitivo.
    expect(phases[phases.indexOf('competitivo') - 1]).toBe('precompetitivo');
    // Después del objetivo solo queda transición.
    const afterTarget = phases.slice(phases.indexOf('competitivo') + 1);
    expect(afterTarget.length).toBeGreaterThan(0);
    for (const phase of afterTarget) {
      expect(phase).toBe('transicion');
    }
  });

  it('sin fecha de objetivo toma el último bloque como competitivo', () => {
    const phases = phasesOf(input({ targetDate: null }));

    expect(phases.at(-1)).toBe('competitivo');
    expect(phases).not.toContain('transicion');
  });

  it('concentra el pico de carga al cerrar el bloque específico', () => {
    const mesocycles = buildMacrocycle(1, input()).mesocycles;
    const peakIndex = mesocycles.findIndex((mesocycle) => mesocycle.load === 'muy-alta');

    expect(peakIndex).toBeGreaterThan(0);
    expect(mesocycles[peakIndex].phase).toBe('preparatorio-especifico');
    expect(mesocycles[peakIndex + 1].phase).toBe('precompetitivo');
  });

  it('baja la carga del bloque competitivo y de la transición', () => {
    const mesocycles = buildMacrocycle(1, input()).mesocycles;

    expect(mesocycles.find((mesocycle) => mesocycle.phase === 'competitivo')!.load).toBe('media');
    expect(mesocycles.find((mesocycle) => mesocycle.phase === 'transicion')!.load).toBe('baja');
  });

  it('cada mesociclo trae el microciclo completo de la semana', () => {
    for (const mesocycle of buildMacrocycle(1, input()).mesocycles) {
      expect(mesocycle.microcycle).toHaveLength(7);
      expect(mesocycle.microcycle.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      // Los días de descanso no tienen contenido asignado.
      for (const day of mesocycle.microcycle) {
        if (day.load === 'descanso') expect(day.workType).toBeNull();
        else expect(day.workType).not.toBeNull();
      }
    }
  });

  it('un macrociclo corto degenera en un único bloque competitivo', () => {
    const phases = phasesOf(
      input({
        startDate: new Date(2026, 2, 2),
        endDate: new Date(2026, 2, 15),
        targetDate: new Date(2026, 2, 14),
      }),
    );

    expect(phases).toEqual(['competitivo']);
  });
});
