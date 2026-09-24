import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { LucideCircleAlert, LucideMessageCircle, LucideSend, LucideX } from '@lucide/angular';
import {
  Athlete,
  PlayersService,
  categoryBadgeClasses,
  categoryLabel,
} from '../../../core/players/players.service';
import { sendFreedSlotWhatsapp } from '../../../core/players/whatsapp';
import { capitalize } from '../../../core/date/calendar-dates';
import { CalendarService } from '../calendar.service';
import { FreedSlotsService } from '../freed-slots.service';
import { FreedSlotEvent } from '../calendar.models';

/** A quiénes se avisa: a toda la base de jugadores o solo a los elegidos. */
type Audience = 'todos' | 'seleccionados';

/** Cantidad de pestañas de WhatsApp desde la que el navegador suele bloquear la apertura. */
const WHATSAPP_TABS_WARNING = 3;

/**
 * Modal que se abre cuando un jugador cancela su turno: le pregunta al entrenador si quiere
 * avisar del cupo liberado a todos los jugadores o solo a algunos. El aviso queda registrado
 * en la app y, opcionalmente, se abre el chat de WhatsApp de cada destinatario.
 */
@Component({
  selector: 'app-freed-slot-notice',
  standalone: true,
  imports: [LucideCircleAlert, LucideMessageCircle, LucideSend, LucideX],
  templateUrl: './freed-slot-notice.html',
})
export class FreedSlotNotice {
  private readonly playersService = inject(PlayersService);
  private readonly calendarService = inject(CalendarService);
  private readonly freedSlots = inject(FreedSlotsService);

  /** Cupo liberado sobre el que se está decidiendo el aviso. */
  readonly event = input.required<FreedSlotEvent>();

  /** Se posterga la decisión: el cupo queda pendiente en la bandeja del entrenador. */
  readonly postponed = output<void>();
  /** Aviso enviado, con la cantidad de destinatarios. */
  readonly sent = output<number>();

  protected readonly categoryLabel = categoryLabel;
  protected readonly categoryBadgeClasses = categoryBadgeClasses;

  protected readonly audience = signal<Audience>('todos');
  protected readonly selectedIds = signal<number[]>([]);
  protected readonly alsoWhatsapp = signal(false);

  /**
   * Candidatos al cupo: jugadores activos que no están anotados en el turno y que no son
   * quien acaba de cancelar.
   */
  protected readonly candidates = computed<Athlete[]>(() => {
    const event = this.event();
    const session = this.calendarService.sessions().find((s) => s.id === event.sessionId);
    const occupied = new Set(
      (session?.attendances ?? [])
        .filter((attendance) => attendance.status === 'confirmado')
        .map((attendance) => attendance.playerId),
    );

    return this.playersService
      .athletes()
      .filter(
        (athlete) =>
          athlete.status === 'activo' && athlete.id !== event.playerId && !occupied.has(athlete.id),
      );
  });

  protected readonly recipients = computed<Athlete[]>(() =>
    this.audience() === 'todos'
      ? this.candidates()
      : this.candidates().filter((athlete) => this.selectedIds().includes(athlete.id)),
  );

  protected readonly dateLabel = computed(() =>
    capitalize(
      new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        this.event().sessionDate,
      ),
    ),
  );

  /** Abrir muchas pestañas de WhatsApp suele terminar bloqueado por el navegador. */
  protected readonly tooManyTabs = computed(
    () => this.alsoWhatsapp() && this.recipients().length > WHATSAPP_TABS_WARNING,
  );

  constructor() {
    // Al cambiar de cupo liberado se reinicia la selección para no arrastrar destinatarios.
    effect(() => {
      this.event();
      this.audience.set('todos');
      this.selectedIds.set([]);
      this.alsoWhatsapp.set(false);
    });
  }

  protected setAudience(audience: Audience): void {
    this.audience.set(audience);
  }

  protected toggleAlsoWhatsapp(): void {
    this.alsoWhatsapp.update((value) => !value);
  }

  protected togglePlayer(playerId: number): void {
    this.selectedIds.update((ids) =>
      ids.includes(playerId) ? ids.filter((id) => id !== playerId) : [...ids, playerId],
    );
  }

  protected isSelected(playerId: number): boolean {
    return this.selectedIds().includes(playerId);
  }

  protected send(): void {
    const recipients = this.recipients();
    if (recipients.length === 0) return;

    const event = this.event();
    this.freedSlots.markNotified(
      event.id,
      recipients.map((athlete) => athlete.id),
    );

    if (this.alsoWhatsapp()) {
      sendFreedSlotWhatsapp(recipients, {
        shiftLabel: event.shiftLabel,
        startTime: event.startTime,
        endTime: event.endTime,
        dateLabel: this.dateLabel(),
      });
    }

    this.sent.emit(recipients.length);
  }

  protected postpone(): void {
    this.postponed.emit();
  }
}
