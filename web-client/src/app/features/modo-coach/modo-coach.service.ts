import { Injectable, computed, signal } from '@angular/core';
import {
  ActionTagType,
  CoachMatch,
  LoggedEvent,
  MatchPlayer,
  MatchSide,
  MatchType,
  TAG_DEFINITIONS,
  TagPolarity,
} from './modo-coach.models';

const STORAGE_KEY = 'tt-trainer-coach-matches';

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class ModoCoachService {
  private readonly _savedMatches = signal<CoachMatch[]>(this.readStored());
  readonly savedMatches = this._savedMatches.asReadonly();

  private readonly _activeMatch = signal<CoachMatch | null>(null);
  readonly activeMatch = this._activeMatch.asReadonly();

  /** Eventos del partido activo, del más reciente al más antiguo. */
  readonly recentEvents = computed<LoggedEvent[]>(() => {
    const match = this._activeMatch();
    if (!match) return [];
    return [...match.events].sort((a, b) => b.timestamp - a.timestamp);
  });

  /** Inicia un nuevo partido en curso a partir de la configuración elegida por el coach. */
  startMatch(
    type: MatchType,
    players: MatchPlayer[],
    sideALabel: string,
    sideBLabel: string,
  ): void {
    const match: CoachMatch = {
      id: randomId(),
      type,
      createdAt: Date.now(),
      sideALabel,
      sideBLabel,
      players,
      scoreA: 0,
      scoreB: 0,
      sets: [],
      matchWinner: null,
      events: [],
      status: 'en-curso',
    };
    this._activeMatch.set(match);
  }

  /** Suma o resta un punto al marcador del lado indicado (no baja de 0) y deja registro del cambio. */
  adjustScore(side: MatchSide, delta: 1 | -1): void {
    const match = this._activeMatch();
    if (!match) return;

    const currentScore = side === 'A' ? match.scoreA : match.scoreB;
    const nextScore = Math.max(0, currentScore + delta);
    if (nextScore === currentScore) return;

    const event: LoggedEvent = {
      id: randomId(),
      matchId: match.id,
      timestamp: Date.now(),
      kind: 'score',
      side,
      playerLabel: side === 'A' ? match.sideALabel : match.sideBLabel,
      scoreDelta: delta,
    };

    this._activeMatch.set({
      ...match,
      scoreA: side === 'A' ? nextScore : match.scoreA,
      scoreB: side === 'B' ? nextScore : match.scoreB,
      events: [...match.events, event],
    });
  }

  /** Registra una etiqueta de acción predeterminada (buena o mala) asociada a un jugador y lado concretos. */
  logTag(side: MatchSide, playerLabel: string, tag: ActionTagType): void {
    const polarity = TAG_DEFINITIONS.find((definition) => definition.id === tag)?.polarity;
    this.pushTagEvent(side, playerLabel, { tag, tagPolarity: polarity });
  }

  /** Registra una acción de texto libre (buena o mala) cuando no está en la lista predeterminada. */
  logCustomTag(side: MatchSide, playerLabel: string, label: string, polarity: TagPolarity): void {
    const customTagLabel = label.trim();
    if (!customTagLabel) return;
    this.pushTagEvent(side, playerLabel, { customTagLabel, tagPolarity: polarity });
  }

  private pushTagEvent(
    side: MatchSide,
    playerLabel: string,
    tagInfo: Pick<LoggedEvent, 'tag' | 'customTagLabel' | 'tagPolarity'>,
  ): void {
    const match = this._activeMatch();
    if (!match) return;

    const event: LoggedEvent = {
      id: randomId(),
      matchId: match.id,
      timestamp: Date.now(),
      kind: 'tag',
      side,
      playerLabel,
      ...tagInfo,
    };

    this._activeMatch.set({ ...match, events: [...match.events, event] });
  }

  /** Cierra el set actual con el lado ganador indicado, lo agrega al historial y reinicia el marcador. */
  finishSet(winner: MatchSide): void {
    const match = this._activeMatch();
    if (!match) return;

    const setResult = {
      setNumber: match.sets.length + 1,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      winner,
    };

    const event: LoggedEvent = {
      id: randomId(),
      matchId: match.id,
      timestamp: Date.now(),
      kind: 'set',
      side: winner,
      playerLabel: winner === 'A' ? match.sideALabel : match.sideBLabel,
      setResult,
    };

    this._activeMatch.set({
      ...match,
      sets: [...match.sets, setResult],
      scoreA: 0,
      scoreB: 0,
      events: [...match.events, event],
    });
  }

  /** Declara el ganador final del partido (no reinicia sets ni marcador). */
  declareMatchWinner(winner: MatchSide): void {
    const match = this._activeMatch();
    if (!match) return;
    this._activeMatch.set({ ...match, matchWinner: winner });
  }

  /** Marca el partido activo como finalizado, lo guarda en el historial y persiste en localStorage. */
  saveActiveMatch(): CoachMatch | null {
    const match = this._activeMatch();
    if (!match) return null;

    const finished: CoachMatch = { ...match, status: 'finalizado' };
    const updated = [...this._savedMatches(), finished];
    this._savedMatches.set(updated);
    this.persist(updated);
    this._activeMatch.set(null);
    return finished;
  }

  /** Descarta el partido activo sin guardarlo en el historial. */
  discardActiveMatch(): void {
    this._activeMatch.set(null);
  }

  private persist(matches: CoachMatch[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.): se ignora silenciosamente.
    }
  }

  private readStored(): CoachMatch[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as CoachMatch[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
