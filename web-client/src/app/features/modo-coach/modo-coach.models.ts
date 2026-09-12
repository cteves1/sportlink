/** Tipo de partido observado en el Modo Coach: individual (1 vs 1) o dobles (2 vs 2). */
export type MatchType = 'singles' | 'dobles';

/** Lado del partido: A (izquierda) o B (derecha). */
export type MatchSide = 'A' | 'B';

/**
 * Slot de jugador dentro del formulario de configuración del partido.
 * Puede resolverse eligiendo un jugador registrado (`athleteId`) o escribiendo
 * manualmente un nombre (`manualName`) si no está en el listado del club.
 */
export interface MatchPlayerSlot {
  side: MatchSide;
  slotIndex: number;
  athleteId: number | null;
  manualName: string;
}

/** Jugador ya resuelto (con nombre a mostrar) dentro de un partido en curso o guardado. */
export interface MatchPlayer {
  side: MatchSide;
  slotIndex: number;
  athleteId: number | null;
  name: string;
}

/** Las 6 etiquetas de acciones soportadas por el panel de tagging rápido. */
export type ActionTagType =
  | 'buen-saque'
  | 'buena-recepcion'
  | 'buena-velocidad'
  | 'mala-posicion'
  | 'mala-recepcion'
  | 'mala-velocidad-respuesta';

/** Polaridad de una etiqueta: acción positiva (buena) o negativa (mala). */
export type TagPolarity = 'positiva' | 'negativa';

export interface TagDefinition {
  id: ActionTagType;
  label: string;
  polarity: TagPolarity;
}

/** Definiciones fijas de las etiquetas de acciones, en el orden en que se muestran. */
export const TAG_DEFINITIONS: TagDefinition[] = [
  { id: 'buen-saque', label: 'Buen Saque', polarity: 'positiva' },
  { id: 'buena-recepcion', label: 'Buena Recepción', polarity: 'positiva' },
  { id: 'buena-velocidad', label: 'Buena Velocidad', polarity: 'positiva' },
  { id: 'mala-posicion', label: 'Mala Posición', polarity: 'negativa' },
  { id: 'mala-recepcion', label: 'Mala Recepción', polarity: 'negativa' },
  { id: 'mala-velocidad-respuesta', label: 'Mala Velocidad de Respuesta', polarity: 'negativa' },
];

/** Resultado de un set ya finalizado dentro del partido. */
export interface MatchSet {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  winner: MatchSide;
}

/** Evento registrado durante el partido: cambio de marcador, etiqueta de acción o fin de set. */
export interface LoggedEvent {
  id: string;
  matchId: string;
  timestamp: number;
  kind: 'score' | 'tag' | 'set';
  side: MatchSide;
  playerLabel: string;
  scoreDelta?: 1 | -1;
  /** Etiqueta predeterminada (si la acción proviene de la lista fija). */
  tag?: ActionTagType;
  /** Texto libre de la acción, cuando el coach escribe una acción que no está en la lista predeterminada. */
  customTagLabel?: string;
  /** Polaridad de la etiqueta, tanto para las predeterminadas como para las de texto libre. */
  tagPolarity?: TagPolarity;
  /** Resultado del set, presente cuando `kind === 'set'`. */
  setResult?: MatchSet;
}

/** Partido observado en Modo Coach: configuración, marcador, sets y eventos registrados. */
export interface CoachMatch {
  id: string;
  type: MatchType;
  createdAt: number;
  sideALabel: string;
  sideBLabel: string;
  players: MatchPlayer[];
  scoreA: number;
  scoreB: number;
  sets: MatchSet[];
  matchWinner: MatchSide | null;
  events: LoggedEvent[];
  status: 'en-curso' | 'finalizado';
}
