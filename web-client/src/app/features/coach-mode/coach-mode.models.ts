/** Tipos de golpe soportados por los ejercicios preestablecidos del Modo Entrenador. */
export type ShotType = 'topspin-derecha' | 'topspin-reves' | 'saque' | 'bloqueo';

/** Foco de trabajo de los ejercicios físicos (sin pelota). */
export type PhysicalFocus = 'desplazamiento' | 'agilidad' | 'resistencia';

/**
 * Categoría del ejercicio, que determina qué se dibuja en RA:
 * `pelota` ancla una mesa reglamentaria y las trayectorias sobre ella,
 * `fisico` ancla conos en el piso y el recorrido entre ellos.
 */
export type DrillCategory = 'pelota' | 'fisico';

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

/** Cono apoyado en el piso, en metros relativos al punto calibrado por el usuario. */
export interface ConeMarker {
  id: number;
  x: number;
  z: number;
  color: string;
}

/** Un paso de un ejercicio físico: desplazarse hasta un cono concreto. */
export interface FootworkStep {
  id: number;
  instruction: string;
  /** Cono de destino de este paso (`ConeMarker.id`). */
  coneId: number;
  durationMs: number;
  color: string;
}

interface DrillBase {
  id: string;
  title: string;
  description: string;
}

/** Ejercicio con pelota: se visualiza sobre una mesa reglamentaria anclada en RA. */
export interface BallDrill extends DrillBase {
  category: 'pelota';
  shotType: ShotType;
  steps: DrillStep[];
}

/** Ejercicio físico: se visualiza como conos en el piso y un recorrido entre ellos. */
export interface PhysicalDrill extends DrillBase {
  category: 'fisico';
  focus: PhysicalFocus;
  cones: ConeMarker[];
  steps: FootworkStep[];
}

/** Ejercicio de entrenamiento preestablecido, listo para visualizarse en RA. */
export type Drill = BallDrill | PhysicalDrill;

/** Dimensiones estándar ITTF de una mesa de tenis de mesa, en metros. */
export const TABLE_DIMENSIONS = {
  length: 2.74,
  width: 1.525,
  height: 0.76,
  netHeight: 0.1525,
  /** La red sobresale 15,25 cm de cada lateral de la mesa. */
  netOverhang: 0.1525,
  /** Ancho de las líneas blancas del borde y de la línea central de dobles. */
  lineWidth: 0.02,
  /** Espesor del tablero de juego. */
  topThickness: 0.025,
} as const;

/** Radio y altura de los conos usados en los ejercicios físicos, en metros. */
export const CONE_DIMENSIONS = {
  radius: 0.07,
  height: 0.2,
} as const;
