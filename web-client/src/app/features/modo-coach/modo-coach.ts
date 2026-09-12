import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  LucideMinus,
  LucidePlus,
  LucideSave,
  LucideSwords,
  LucideThumbsDown,
  LucideThumbsUp,
  LucideUsers,
} from '@lucide/angular';
import { PlayersService } from '../../core/players/players.service';
import { ModoCoachService } from './modo-coach.service';
import {
  ActionTagType,
  LoggedEvent,
  MatchPlayer,
  MatchSide,
  MatchType,
  TAG_DEFINITIONS,
  TagPolarity,
} from './modo-coach.models';

interface SlotFormValue {
  side: MatchSide;
  slotIndex: number;
  athleteId: number | null;
  manualName: string;
}

@Component({
  selector: 'app-modo-coach',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LucideSwords,
    LucideUsers,
    LucidePlus,
    LucideMinus,
    LucideThumbsUp,
    LucideThumbsDown,
    LucideSave,
  ],
  templateUrl: './modo-coach.html',
})
export class ModoCoach {
  private readonly fb = inject(FormBuilder);
  private readonly playersService = inject(PlayersService);
  private readonly modoCoachService = inject(ModoCoachService);

  protected readonly sides: MatchSide[] = ['A', 'B'];
  protected readonly athletes = this.playersService.athletes;
  protected readonly activeMatch = this.modoCoachService.activeMatch;
  protected readonly recentEvents = this.modoCoachService.recentEvents;
  protected readonly positiveTags = TAG_DEFINITIONS.filter((tag) => tag.polarity === 'positiva');
  protected readonly negativeTags = TAG_DEFINITIONS.filter((tag) => tag.polarity === 'negativa');

  protected readonly matchType = signal<MatchType>('singles');
  protected readonly formError = signal<string | null>(null);
  protected readonly savedBanner = signal(false);

  /** Jugador seleccionado como objetivo de las etiquetas, por lado (relevante en dobles). */
  protected readonly taggedPlayerA = signal(0);
  protected readonly taggedPlayerB = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    slots: this.fb.array(this.buildSlotGroups('singles')),
  });

  protected get slots(): FormArray {
    return this.form.get('slots') as FormArray;
  }

  protected sideSlots(side: MatchSide): FormGroup[] {
    return (this.slots.controls as FormGroup[]).filter((control) => control.value.side === side);
  }

  protected sidePlayers(side: MatchSide): MatchPlayer[] {
    return (this.activeMatch()?.players ?? []).filter((player) => player.side === side);
  }

  private buildSlotGroups(type: MatchType) {
    const slotsPerSide = type === 'singles' ? 1 : 2;
    const groups = [];
    for (const side of ['A', 'B'] as MatchSide[]) {
      for (let slotIndex = 0; slotIndex < slotsPerSide; slotIndex++) {
        groups.push(
          this.fb.nonNullable.group({
            side: [side],
            slotIndex: [slotIndex],
            athleteId: this.fb.control<number | null>(null),
            manualName: [''],
          }),
        );
      }
    }
    return groups;
  }

  protected selectMatchType(type: MatchType): void {
    this.matchType.set(type);
    this.formError.set(null);
    this.form.setControl('slots', this.fb.array(this.buildSlotGroups(type)));
  }

  /** Devuelve el nombre a mostrar de un jugador registrado, para etiquetar el <option>. */
  protected athleteLabel(athleteId: number): string {
    const athlete = this.athletes().find((a) => a.id === athleteId);
    return athlete ? `${athlete.firstName} ${athlete.lastName}` : '';
  }

  private resolveSlotName(value: SlotFormValue): string {
    const manual = value.manualName.trim();
    if (manual) return manual;
    if (value.athleteId != null) return this.athleteLabel(value.athleteId);
    return '';
  }

  protected startMatch(): void {
    this.formError.set(null);
    const values = this.slots.value as SlotFormValue[];

    const players: MatchPlayer[] = values.map((value) => ({
      side: value.side,
      slotIndex: value.slotIndex,
      athleteId: value.athleteId,
      name: this.resolveSlotName(value),
    }));

    if (players.some((player) => !player.name)) {
      this.formError.set(
        'Completa un jugador (de la lista o escrito a mano) en cada casillero antes de iniciar.',
      );
      return;
    }

    const type = this.matchType();
    const sideALabel = players
      .filter((p) => p.side === 'A')
      .map((p) => p.name)
      .join(' / ');
    const sideBLabel = players
      .filter((p) => p.side === 'B')
      .map((p) => p.name)
      .join(' / ');

    this.taggedPlayerA.set(0);
    this.taggedPlayerB.set(0);
    this.savedBanner.set(false);
    this.modoCoachService.startMatch(type, players, sideALabel, sideBLabel);
  }

  protected adjustScore(side: MatchSide, delta: 1 | -1): void {
    this.modoCoachService.adjustScore(side, delta);
  }

  protected selectTaggedPlayer(side: MatchSide, index: number): void {
    if (side === 'A') this.taggedPlayerA.set(index);
    else this.taggedPlayerB.set(index);
  }

  protected logTag(side: MatchSide, tag: ActionTagType): void {
    const player = this.taggedPlayer(side);
    if (!player) return;
    this.modoCoachService.logTag(side, player.name, tag);
  }

  /** Registra una acción de texto libre (no está en la lista predeterminada) para el lado indicado. */
  protected addCustomTag(side: MatchSide, polarity: TagPolarity, label: string): void {
    const text = label.trim();
    if (!text) return;
    const player = this.taggedPlayer(side);
    if (!player) return;
    this.modoCoachService.logCustomTag(side, player.name, text, polarity);
  }

  private taggedPlayer(side: MatchSide): MatchPlayer | undefined {
    const players = this.sidePlayers(side);
    const index = side === 'A' ? this.taggedPlayerA() : this.taggedPlayerB();
    return players[index] ?? players[0];
  }

  /** Cantidad de sets ganados por un lado hasta el momento. */
  protected setsWon(side: MatchSide): number {
    return (this.activeMatch()?.sets ?? []).filter((set) => set.winner === side).length;
  }

  protected finishSet(winner: MatchSide): void {
    this.modoCoachService.finishSet(winner);
  }

  protected declareWinner(winner: MatchSide): void {
    this.modoCoachService.declareMatchWinner(winner);
  }

  protected saveMatch(): void {
    this.modoCoachService.saveActiveMatch();
    this.savedBanner.set(true);
    this.selectMatchType(this.matchType());
  }

  protected discardMatch(): void {
    this.modoCoachService.discardActiveMatch();
  }

  protected tagLabel(tag: ActionTagType): string {
    return TAG_DEFINITIONS.find((definition) => definition.id === tag)?.label ?? tag;
  }

  protected eventDescription(event: LoggedEvent): string {
    if (event.kind === 'score') {
      return event.scoreDelta === 1 ? 'Punto sumado' : 'Punto restado';
    }
    if (event.kind === 'set') {
      const set = event.setResult!;
      return `Fin del set ${set.setNumber} (${set.scoreA}-${set.scoreB})`;
    }
    return event.customTagLabel ?? this.tagLabel(event.tag!);
  }

  protected formatTime(timestamp: number): string {
    return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
      new Date(timestamp),
    );
  }
}
