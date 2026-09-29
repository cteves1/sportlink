import { TestBed } from '@angular/core/testing';
import {
  CATEGORY_OPTIONS,
  NewAthleteInput,
  PlayersService,
  WelcomeFormAnswers,
  categoryLabel,
  isEliteCategory,
  paddleGripLabel,
  trainingDaysLabel,
} from './players.service';
import { SupabaseService } from '../supabase/supabase.service';
import { fakeSupabaseService, FakeResolver } from '../supabase/supabase-testing';

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

function dbAthleteFromInput(id: number, input: NewAthleteInput, overrides: Record<string, unknown> = {}) {
  const isIntermediateOrAbove = input.level === 'intermedio' || input.level === 'avanzado';
  const isAdvanced = input.level === 'avanzado';
  return {
    id,
    user_id: null,
    first_name: input.firstName,
    last_name: input.lastName,
    birth_date: input.birthDate.toISOString().split('T')[0],
    phone: input.phone,
    category: input.category,
    status: 'activo',
    player_type: input.playerType,
    dominant_hand: input.dominantHand,
    level: input.level,
    paddle_grip: isIntermediateOrAbove ? input.paddleGrip : null,
    rubber_forehand: isIntermediateOrAbove ? input.rubberForehand : null,
    rubber_backhand: isIntermediateOrAbove ? input.rubberBackhand : null,
    playing_style: isIntermediateOrAbove ? input.playingStyle : null,
    club: isAdvanced ? input.club : null,
    specific_goal: isAdvanced ? input.specificGoal : null,
    training_days: [...input.trainingDays].sort((a, b) => a - b),
    attendance_rate: 0,
    username: 'ana.gomez',
    temp_password: 'TM-2026-ABCD',
    welcome_form_completed: false,
    welcome_form_answers: [] as unknown[],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
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
  let resolverCalls: { table: string; operation: string; payload: unknown; filters: unknown[] }[];

  beforeEach(() => {
    resolverCalls = [];
  });

  function configureService(resolver: FakeResolver) {
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(resolver) }],
    });
    service = TestBed.inject(PlayersService);
  }

  it('guarda el perfil completo de un avanzado y ordena los días acordados', async () => {
    const input = newAthlete();
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'athletes' && operation === 'insert') {
        return { data: { id: 1 }, error: null };
      }
      return { data: null, error: null };
    });

    const created = await service.addAthlete(input);

    expect(created).not.toBeNull();
    expect(created!.level).toBe('avanzado');
    expect(created!.club).toBe('Club Atlético Norte');
    expect(created!.specificGoal).toBe('Clasificar al Nacional Sub-19');
    expect(created!.trainingDays).toEqual([1, 3, 5]);
  });

  it('descarta paleta, gomas, estilo, club y objetivo de un principiante', async () => {
    const input = newAthlete({ level: 'principiante' });
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'athletes' && operation === 'insert') {
        return { data: { id: 1 }, error: null };
      }
      return { data: null, error: null };
    });

    const created = await service.addAthlete(input);

    expect(created!.paddleGrip).toBeNull();
    expect(created!.rubberForehand).toBeNull();
    expect(created!.rubberBackhand).toBeNull();
    expect(created!.playingStyle).toBeNull();
    expect(created!.club).toBeNull();
    expect(created!.specificGoal).toBeNull();
    expect(created!.trainingDays).toEqual([1, 3, 5]);
  });

  it('conserva paleta, gomas y estilo de un intermedio pero no club ni objetivo', async () => {
    const input = newAthlete({ level: 'intermedio' });
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'athletes' && operation === 'insert') {
        return { data: { id: 1 }, error: null };
      }
      return { data: null, error: null };
    });

    const created = await service.addAthlete(input);

    expect(created!.paddleGrip).toBe('lapicero');
    expect(created!.playingStyle).toBe('ofensivo');
    expect(created!.club).toBeNull();
    expect(created!.specificGoal).toBeNull();
  });

  it('acepta las categorías Atleta Elite e Infantil', async () => {
    let insertCount = 0;
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'athletes' && operation === 'insert') {
        insertCount++;
        const input = insertCount === 1 ? newAthlete({ category: 0 }) : newAthlete({ category: 9 });
        return { data: { id: insertCount }, error: null };
      }
      return { data: null, error: null };
    });

    const elite = await service.addAthlete(newAthlete({ category: 0 }));
    expect(elite!.category).toBe(0);

    const infantil = await service.addAthlete(newAthlete({ category: 9 }));
    expect(infantil!.category).toBe(9);
  });

  it('al editar refleja el cambio en el signal de atletas', async () => {
    const createdInput = newAthlete();
    const updatedInput = newAthlete({ level: 'principiante' });

    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'athletes' && operation === 'insert') {
        return { data: { id: 1 }, error: null };
      }
      if (table === 'athletes' && (operation === 'update' || operation === 'select')) {
        return { data: [dbAthleteFromInput(1, updatedInput)], error: null };
      }
      return { data: null, error: null };
    });

    const created = await service.addAthlete(createdInput);
    await service.updateAthlete(created!.id, updatedInput);

    const updated = service.athletes().find((athlete) => athlete.id === created!.id);
    expect(updated?.level).toBe('principiante');
    expect(updated?.paddleGrip).toBeNull();
    expect(updated?.club).toBeNull();
  });

  it('guarda el formulario de bienvenida y actualiza el estado del atleta', async () => {
    const input = newAthlete();
    const answers: WelcomeFormAnswers = {
      mainGoal: 'competir',
      shortTermGoal: 'mejorar saque',
      longTermGoal: 'subir de categoría',
      motivation: 'alta',
      coachSupport: 'planificación',
      yearsPlaying: '3-a-5',
      hasCompeted: true,
      selfPerceivedLevel: 'avanzado',
      paddleGrip: 'lapicero',
      rubberForehand: 'liso',
      rubberBackhand: 'liso',
      playingStyle: 'ofensivo',
      club: 'Club',
      specificGoal: 'Objetivo',
      trainingDays: [1, 3],
    };

    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'welcome_form_answers' && operation === 'upsert') {
        return { data: null, error: null };
      }
      if (table === 'athletes' && operation === 'select') {
        return {
          data: [
            dbAthleteFromInput(1, input, {
              welcome_form_completed: true,
              welcome_form_answers: [
                {
                  main_goal: answers.mainGoal,
                  short_term_goal: answers.shortTermGoal,
                  long_term_goal: answers.longTermGoal,
                  motivation: answers.motivation,
                  coach_support: answers.coachSupport,
                  years_playing: answers.yearsPlaying,
                  has_competed: answers.hasCompeted,
                  self_perceived_level: answers.selfPerceivedLevel,
                  paddle_grip: answers.paddleGrip,
                  rubber_forehand: answers.rubberForehand,
                  rubber_backhand: answers.rubberBackhand,
                  playing_style: answers.playingStyle,
                  club: answers.club,
                  specific_goal: answers.specificGoal,
                  training_days: answers.trainingDays,
                },
              ],
            }),
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await service.submitWelcomeForm(1, answers);

    expect(service.isWelcomeFormPending(1)).toBe(false);
    const athlete = service.athletes()[0];
    expect(athlete.welcomeFormCompleted).toBe(true);
    expect(athlete.welcomeForm?.mainGoal).toBe('competir');
  });

  it('alterna el estado activo/inactivo del atleta en el signal', async () => {
    const input = newAthlete();
    configureService((table, operation, payload, filters) => {
      resolverCalls.push({ table, operation, payload, filters });
      if (table === 'athletes' && operation === 'insert') {
        return { data: { id: 1 }, error: null };
      }
      return { data: null, error: null };
    });

    const created = await service.addAthlete(input);
    await service.toggleStatus(created!.id);

    const updated = service.athletes().find((a) => a.id === created!.id);
    expect(updated?.status).toBe('inactivo');
  });
});
