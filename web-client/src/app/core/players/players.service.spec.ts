import { TestBed } from '@angular/core/testing';
import {
  CATEGORY_OPTIONS,
  NewAthleteInput,
  PlayersService,
  categoryLabel,
  isEliteCategory,
  paddleGripLabel,
  trainingDaysLabel,
} from './players.service';

function newAthlete(overrides: Partial<NewAthleteInput> = {}): NewAthleteInput {
  return {
    firstName: 'Ana',
    lastName: 'Gómez',
    category: 5,
    birthDate: new Date(2008, 4, 12),
    dominantHand: 'derecha',
    phone: '+54 9 11 1234-5678',
    playerType: 'regular',
    level: 'avanzado',
    paddleGrip: 'lapicero',
    rubberForehand: 'liso',
    rubberBackhand: 'pupo-largo',
    playingStyle: 'ofensivo',
    club: 'Club Atlético Norte',
    specificGoal: 'Clasificar al Nacional Sub-19',
    trainingDays: [3, 1, 5],
    ...overrides,
  };
}

describe('categoryLabel', () => {
  it('nombra las categorías especiales y numera el resto', () => {
    expect(categoryLabel(0)).toBe('Atleta Elite');
    expect(categoryLabel(1)).toBe('Cat 1');
    expect(categoryLabel(8)).toBe('Cat 8');
    expect(categoryLabel(9)).toBe('Infantil');
  });

  it('ordena las opciones de Atleta Elite (0) a Infantil (9)', () => {
    expect(CATEGORY_OPTIONS[0]).toBe(0);
    expect(CATEGORY_OPTIONS.at(-1)).toBe(9);
    expect(CATEGORY_OPTIONS.length).toBe(10);
  });

  it('considera élite solo a Atleta Elite y a la categoría 1', () => {
    expect(isEliteCategory(0)).toBe(true);
    expect(isEliteCategory(1)).toBe(true);
    expect(isEliteCategory(2)).toBe(false);
    expect(isEliteCategory(9)).toBe(false);
  });
});

describe('etiquetas del perfil de juego', () => {
  it('muestra "Sin especificar" cuando el dato no está definido', () => {
    expect(paddleGripLabel(null)).toBe('Sin especificar');
    expect(paddleGripLabel('clasica')).toBe('Clásica');
  });

  it('lista los días de entrenamiento en orden de la semana', () => {
    expect(trainingDaysLabel([5, 1, 3])).toBe('Lun · Mié · Vie');
    expect(trainingDaysLabel([])).toBe('Sin acordar');
  });
});

describe('PlayersService', () => {
  let service: PlayersService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayersService);
  });

  it('guarda el perfil completo de un avanzado y ordena los días acordados', () => {
    const created = service.addAthlete(newAthlete());

    expect(created.level).toBe('avanzado');
    expect(created.club).toBe('Club Atlético Norte');
    expect(created.specificGoal).toBe('Clasificar al Nacional Sub-19');
    expect(created.trainingDays).toEqual([1, 3, 5]);
  });

  it('descarta paleta, gomas, estilo, club y objetivo de un principiante', () => {
    const created = service.addAthlete(newAthlete({ level: 'principiante' }));

    expect(created.paddleGrip).toBeNull();
    expect(created.rubberForehand).toBeNull();
    expect(created.rubberBackhand).toBeNull();
    expect(created.playingStyle).toBeNull();
    expect(created.club).toBeNull();
    expect(created.specificGoal).toBeNull();
    // Los días acordados con el entrenador se guardan para cualquier nivel.
    expect(created.trainingDays).toEqual([1, 3, 5]);
  });

  it('conserva paleta, gomas y estilo de un intermedio pero no club ni objetivo', () => {
    const created = service.addAthlete(newAthlete({ level: 'intermedio' }));

    expect(created.paddleGrip).toBe('lapicero');
    expect(created.playingStyle).toBe('ofensivo');
    expect(created.club).toBeNull();
    expect(created.specificGoal).toBeNull();
  });

  it('acepta las categorías nuevas Atleta Elite e Infantil', () => {
    expect(service.addAthlete(newAthlete({ category: 0 })).category).toBe(0);
    expect(service.addAthlete(newAthlete({ category: 9 })).category).toBe(9);
  });

  it('al editar recorta el perfil si el jugador baja de nivel', () => {
    const created = service.addAthlete(newAthlete());

    service.updateAthlete(created.id, newAthlete({ level: 'principiante' }));

    const updated = service.athletes().find((athlete) => athlete.id === created.id);
    expect(updated?.level).toBe('principiante');
    expect(updated?.paddleGrip).toBeNull();
    expect(updated?.club).toBeNull();
  });

  it('rellena los campos nuevos al leer un jugador guardado sin perfil de juego', () => {
    // Registro con el formato anterior, tal como quedó en localStorage.
    localStorage.setItem(
      'tt-trainer-players',
      JSON.stringify([
        {
          id: 1,
          firstName: 'Pedro',
          lastName: 'Luna',
          category: 4,
          status: 'activo',
          playerType: 'regular',
          phone: '+54 11 5555-5555',
          username: 'pedro.luna',
          tempPassword: 'TM-2026-ABCD',
          attendance: 80,
          birthDate: new Date(2005, 1, 1).toISOString(),
          dominantHand: 'derecha',
          paddleGrip: 'clasica',
          welcomeFormCompleted: false,
          welcomeForm: null,
        },
      ]),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const migrated = TestBed.inject(PlayersService).athletes()[0];

    expect(migrated.level).toBe('intermedio');
    expect(migrated.trainingDays).toEqual([]);
    expect(migrated.rubberForehand).toBeNull();
    expect(migrated.playingStyle).toBeNull();
    expect(migrated.birthDate instanceof Date).toBe(true);
  });
});
