import { Injectable, computed, signal } from '@angular/core';
import {
  BallDrill,
  Drill,
  DrillCategory,
  PhysicalDrill,
  TABLE_DIMENSIONS,
  TrajectoryPoint,
} from './coach-mode.models';

const HALF_WIDTH = TABLE_DIMENSIONS.width / 2;
const HALF_LENGTH = TABLE_DIMENSIONS.length / 2;

/** Genera una curva parabólica simple entre dos puntos de la mesa, con un pico de altura `apex` sobre la red. */
function arc(from: [number, number], to: [number, number], apex: number): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from[0] + (to[0] - from[0]) * t;
    const z = from[1] + (to[1] - from[1]) * t;
    // Parábola con pico en t=0.5, apoyada sobre la superficie de la mesa (y=0).
    const y = apex * 4 * t * (1 - t);
    points.push({ x, y, z });
  }
  return points;
}

/** Ejercicios con pelota: se visualizan sobre una mesa reglamentaria anclada en RA. */
const BALL_DRILLS: BallDrill[] = [
  {
    id: 'topspin-derecha-cruzado',
    title: 'Topspin de derecha: 3 cruzadas, 1 paralela',
    description:
      'Serie de 4 bolas de topspin de derecha: 3 diagonales cruzadas hacia el revés del rival y 1 paralela por la línea, repitiendo el patrón.',
    category: 'pelota',
    shotType: 'topspin-derecha',
    steps: [
      {
        id: 1,
        instruction: 'Topspin cruzado nº1: apunta a la esquina del revés',
        trajectory: arc([HALF_WIDTH * 0.6, -HALF_LENGTH], [-HALF_WIDTH * 0.6, HALF_LENGTH], 0.35),
        durationMs: 1400,
        color: '#16a34a',
      },
      {
        id: 2,
        instruction: 'Topspin cruzado nº2: mantén el ritmo',
        trajectory: arc([HALF_WIDTH * 0.6, -HALF_LENGTH], [-HALF_WIDTH * 0.6, HALF_LENGTH], 0.35),
        durationMs: 1400,
        color: '#16a34a',
      },
      {
        id: 3,
        instruction: 'Topspin cruzado nº3: prepara el cambio a paralela',
        trajectory: arc([HALF_WIDTH * 0.6, -HALF_LENGTH], [-HALF_WIDTH * 0.6, HALF_LENGTH], 0.35),
        durationMs: 1400,
        color: '#16a34a',
      },
      {
        id: 4,
        instruction: '¡Cambia ahora! Topspin paralelo por la línea',
        trajectory: arc([HALF_WIDTH * 0.6, -HALF_LENGTH], [HALF_WIDTH * 0.75, HALF_LENGTH], 0.35),
        durationMs: 1400,
        color: '#f59e0b',
      },
    ],
  },
  {
    id: 'topspin-reves-diagonal',
    title: 'Topspin de revés a la diagonal larga',
    description:
      'Bloques repetidos de topspin de revés jugados a la diagonal larga (cruzado), enfocados en consistencia y rotación.',
    category: 'pelota',
    shotType: 'topspin-reves',
    steps: [
      {
        id: 1,
        instruction: 'Revés diagonal: gira la cadera y acompaña la bola',
        trajectory: arc([-HALF_WIDTH * 0.6, -HALF_LENGTH], [HALF_WIDTH * 0.6, HALF_LENGTH], 0.3),
        durationMs: 1500,
        color: '#2563eb',
      },
      {
        id: 2,
        instruction: 'Repite el mismo trazo, busca profundidad',
        trajectory: arc([-HALF_WIDTH * 0.6, -HALF_LENGTH], [HALF_WIDTH * 0.6, HALF_LENGTH], 0.3),
        durationMs: 1500,
        color: '#2563eb',
      },
      {
        id: 3,
        instruction: 'Acelera el último tercio del movimiento',
        trajectory: arc([-HALF_WIDTH * 0.6, -HALF_LENGTH], [HALF_WIDTH * 0.6, HALF_LENGTH], 0.3),
        durationMs: 1500,
        color: '#2563eb',
      },
    ],
  },
  {
    id: 'saque-corto-tercera-bola',
    title: 'Saque corto + ataque de tercera bola',
    description:
      'Saque corto y bajo hacia el revés, seguido de un topspin de tercera bola agresivo hacia el ángulo abierto.',
    category: 'pelota',
    shotType: 'saque',
    steps: [
      {
        id: 1,
        instruction: 'Saque corto y bajo, gira hacia el revés del rival',
        trajectory: arc(
          [HALF_WIDTH * 0.3, -HALF_LENGTH],
          [-HALF_WIDTH * 0.5, HALF_LENGTH * 0.15],
          0.12,
        ),
        durationMs: 900,
        color: '#0f5132',
      },
      {
        id: 2,
        instruction: 'Espera la devolución corta',
        trajectory: arc(
          [-HALF_WIDTH * 0.5, HALF_LENGTH * 0.15],
          [HALF_WIDTH * 0.2, -HALF_LENGTH * 0.2],
          0.08,
        ),
        durationMs: 700,
        color: '#9ca3af',
      },
      {
        id: 3,
        instruction: '¡Tercera bola! Ataca el ángulo abierto',
        trajectory: arc(
          [HALF_WIDTH * 0.2, -HALF_LENGTH * 0.2],
          [-HALF_WIDTH * 0.8, HALF_LENGTH],
          0.4,
        ),
        durationMs: 1300,
        color: '#dc2626',
      },
    ],
  },
  {
    id: 'bloqueo-alterno',
    title: 'Bloqueo alterno derecha/revés',
    description:
      'Bloqueos cortos alternando entre la esquina de derecha y de revés, priorizando reacción rápida y colocación.',
    category: 'pelota',
    shotType: 'bloqueo',
    steps: [
      {
        id: 1,
        instruction: 'Bloqueo corto a la derecha',
        trajectory: arc(
          [-HALF_WIDTH * 0.5, -HALF_LENGTH],
          [HALF_WIDTH * 0.7, HALF_LENGTH * 0.5],
          0.15,
        ),
        durationMs: 1000,
        color: '#7c3aed',
      },
      {
        id: 2,
        instruction: 'Bloqueo corto al revés',
        trajectory: arc(
          [HALF_WIDTH * 0.7, HALF_LENGTH * 0.5],
          [-HALF_WIDTH * 0.7, -HALF_LENGTH * 0.5],
          0.15,
        ),
        durationMs: 1000,
        color: '#7c3aed',
      },
      {
        id: 3,
        instruction: 'Repite alternando, mantén los codos cerca del cuerpo',
        trajectory: arc(
          [-HALF_WIDTH * 0.7, -HALF_LENGTH * 0.5],
          [HALF_WIDTH * 0.7, HALF_LENGTH * 0.5],
          0.15,
        ),
        durationMs: 1000,
        color: '#7c3aed',
      },
    ],
  },
];

const CONE_ORANGE = '#f97316';
const CONE_BLUE = '#2563eb';
const CONE_GREEN = '#16a34a';

/**
 * Ejercicios físicos (sin pelota): se visualizan como conos apoyados en el piso.
 * Las coordenadas están en metros respecto del punto que el usuario calibra, con `z`
 * negativo hacia la mesa: así el jugador calibra donde se para y los conos quedan
 * distribuidos a su alrededor.
 */
const PHYSICAL_DRILLS: PhysicalDrill[] = [
  {
    id: 'fisico-desplazamiento-lateral',
    title: 'Desplazamiento lateral entre 2 conos',
    description:
      'Dos conos separados 2 metros: desplazamiento lateral con pasos cortos, sin cruzar los pies y manteniendo la posición baja.',
    category: 'fisico',
    focus: 'desplazamiento',
    cones: [
      { id: 1, x: -1, z: 0, color: CONE_ORANGE },
      { id: 2, x: 1, z: 0, color: CONE_BLUE },
    ],
    steps: [
      {
        id: 1,
        instruction: 'Desplázate al cono izquierdo y toca el piso',
        coneId: 1,
        durationMs: 1200,
        color: CONE_ORANGE,
      },
      {
        id: 2,
        instruction: 'Vuelve al cono derecho sin cruzar los pies',
        coneId: 2,
        durationMs: 1200,
        color: CONE_BLUE,
      },
    ],
  },
  {
    id: 'fisico-triangulo-footwork',
    title: 'Triángulo de footwork (3 conos)',
    description:
      'Triángulo de 3 conos para trabajar la entrada al golpe: dos laterales atrás y uno adelante, simulando la bola corta.',
    category: 'fisico',
    focus: 'agilidad',
    cones: [
      { id: 1, x: -1.1, z: 0.6, color: CONE_ORANGE },
      { id: 2, x: 1.1, z: 0.6, color: CONE_BLUE },
      { id: 3, x: 0, z: -0.9, color: CONE_GREEN },
    ],
    steps: [
      {
        id: 1,
        instruction: 'Sal al cono lateral izquierdo (derecha desde el revés)',
        coneId: 1,
        durationMs: 1100,
        color: CONE_ORANGE,
      },
      {
        id: 2,
        instruction: 'Cruza al cono lateral derecho',
        coneId: 2,
        durationMs: 1100,
        color: CONE_BLUE,
      },
      {
        id: 3,
        instruction: 'Entra al cono de adelante: simula la bola corta',
        coneId: 3,
        durationMs: 1000,
        color: CONE_GREEN,
      },
      {
        id: 4,
        instruction: 'Recupera hacia el lateral izquierdo y repite',
        coneId: 1,
        durationMs: 1100,
        color: CONE_ORANGE,
      },
    ],
  },
  {
    id: 'fisico-estrella-cinco-conos',
    title: 'Estrella de 5 conos',
    description:
      'Cinco conos en estrella con salida y regreso al centro en cada repetición: resistencia específica y cambios de dirección.',
    category: 'fisico',
    focus: 'resistencia',
    cones: [
      { id: 1, x: 0, z: 0, color: CONE_GREEN },
      { id: 2, x: -1.2, z: -0.8, color: CONE_ORANGE },
      { id: 3, x: 1.2, z: -0.8, color: CONE_BLUE },
      { id: 4, x: -1.2, z: 0.9, color: CONE_ORANGE },
      { id: 5, x: 1.2, z: 0.9, color: CONE_BLUE },
    ],
    steps: [
      {
        id: 1,
        instruction: 'Salida al cono delantero izquierdo',
        coneId: 2,
        durationMs: 1000,
        color: CONE_ORANGE,
      },
      {
        id: 2,
        instruction: 'Vuelve al centro en posición baja',
        coneId: 1,
        durationMs: 800,
        color: CONE_GREEN,
      },
      {
        id: 3,
        instruction: 'Salida al cono delantero derecho',
        coneId: 3,
        durationMs: 1000,
        color: CONE_BLUE,
      },
      {
        id: 4,
        instruction: 'Vuelve al centro',
        coneId: 1,
        durationMs: 800,
        color: CONE_GREEN,
      },
      {
        id: 5,
        instruction: 'Retrocede al cono trasero izquierdo',
        coneId: 4,
        durationMs: 1100,
        color: CONE_ORANGE,
      },
      {
        id: 6,
        instruction: 'Vuelve al centro',
        coneId: 1,
        durationMs: 800,
        color: CONE_GREEN,
      },
      {
        id: 7,
        instruction: 'Retrocede al cono trasero derecho',
        coneId: 5,
        durationMs: 1100,
        color: CONE_BLUE,
      },
      {
        id: 8,
        instruction: 'Cierra la serie volviendo al centro',
        coneId: 1,
        durationMs: 800,
        color: CONE_GREEN,
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class CoachModeService {
  /** Ejercicios preestablecidos disponibles para elegir en la vista de configuración. */
  readonly drills = signal<Drill[]>([...BALL_DRILLS, ...PHYSICAL_DRILLS]);

  /** Ejercicios de una categoría concreta, para las pestañas de la vista de configuración. */
  drillsByCategory(category: DrillCategory): Drill[] {
    return this.drills().filter((drill) => drill.category === category);
  }

  private readonly _selectedDrillId = signal<string | null>(null);
  readonly selectedDrillId = this._selectedDrillId.asReadonly();

  readonly selectedDrill = computed<Drill | null>(() => {
    const id = this._selectedDrillId();
    if (!id) return null;
    return this.drills().find((drill) => drill.id === id) ?? null;
  });

  selectDrill(id: string): void {
    this._selectedDrillId.set(id);
  }

  clearSelection(): void {
    this._selectedDrillId.set(null);
  }

  drillById(id: string): Drill | null {
    return this.drills().find((drill) => drill.id === id) ?? null;
  }
}
