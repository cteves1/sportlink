import { Injectable, computed, signal } from '@angular/core';
import { Drill, TABLE_DIMENSIONS, TrajectoryPoint } from './coach-mode.models';

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

/** Ejercicios preestablecidos disponibles en el Modo Entrenador (sin generación por IA ni texto libre). */
const PRESET_DRILLS: Drill[] = [
  {
    id: 'topspin-derecha-cruzado',
    title: 'Topspin de derecha: 3 cruzadas, 1 paralela',
    description:
      'Serie de 4 bolas de topspin de derecha: 3 diagonales cruzadas hacia el revés del rival y 1 paralela por la línea, repitiendo el patrón.',
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

@Injectable({ providedIn: 'root' })
export class CoachModeService {
  /** Ejercicios preestablecidos disponibles para elegir en la vista de configuración. */
  readonly drills = signal<Drill[]>(PRESET_DRILLS);

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

  drillById(id: string): Drill | null {
    return this.drills().find((drill) => drill.id === id) ?? null;
  }
}
