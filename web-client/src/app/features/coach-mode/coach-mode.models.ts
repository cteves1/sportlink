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

/** Escalera de agilidad apoyada en el piso, que avanza desde el punto calibrado hacia adelante. */
export interface LadderSpec {
  /** Cantidad de cuadrados (celdas) de la escalera. */
  cells: number;
  /** Largo de cada cuadrado, en metros. */
  cellLength: number;
  /** Ancho de la escalera, en metros. */
  width: number;
}

/** Costado de la escalera donde se apoya el pie en cada paso. */
export type LadderSide = 'izquierda' | 'centro' | 'derecha';

/** Destino de un paso de un ejercicio físico: un cono o una celda de la escalera. */
export type FootworkTarget =
  { kind: 'cono'; coneId: number } | { kind: 'escalera'; cell: number; side: LadderSide };

/** Un paso de un ejercicio físico: desplazarse hasta el destino indicado. */
export interface FootworkStep {
  id: number;
  instruction: string;
  target: FootworkTarget;
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

/** Ejercicio físico: se visualiza como conos (o una escalera) en el piso y el recorrido entre ellos. */
export interface PhysicalDrill extends DrillBase {
  category: 'fisico';
  focus: PhysicalFocus;
  cones: ConeMarker[];
  /** Presente solo en ejercicios de escalera de agilidad. */
  ladder?: LadderSpec;
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

/** Escala con la que se dibuja el ejercicio en RA, ajustable por el usuario durante la sesión. */
export const DRILL_SCALE = {
  min: 0.5,
  max: 2,
  step: 0.05,
  default: 1,
} as const;
