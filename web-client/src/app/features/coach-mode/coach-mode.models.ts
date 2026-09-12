/** Tipos de golpe soportados por los ejercicios preestablecidos del Modo Entrenador. */
export type ShotType = 'topspin-derecha' | 'topspin-reves' | 'saque' | 'bloqueo';

/** Punto de una trayectoria en metros, relativo al centro de la mesa (origen calibrado por el usuario en RA). */
export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
}

/** Un paso individual del ejercicio: una trayectoria de pelota + instrucción asociada. */
export interface DrillStep {
  id: number;
  instruction: string;
  /** Curva que sigue la pelota animada, en metros relativos al centro de la mesa. */
  trajectory: TrajectoryPoint[];
  /** Duración de la animación de este paso, en milisegundos. */
  durationMs: number;
  /** Color de la línea de trayectoria y de la pelota (hex CSS). */
  color: string;
}

/** Ejercicio de entrenamiento preestablecido, listo para visualizarse en RA. */
export interface Drill {
  id: string;
  title: string;
  description: string;
  shotType: ShotType;
  steps: DrillStep[];
}

/** Dimensiones estándar ITTF de una mesa de tenis de mesa, en metros. */
export const TABLE_DIMENSIONS = {
  length: 2.74,
  width: 1.525,
  height: 0.76,
  netHeight: 0.1525,
} as const;
