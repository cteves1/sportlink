import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, CalendarOptions } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/angular/daygrid';
import timeGridPlugin from '@fullcalendar/angular/timegrid';
import interactionPlugin from '@fullcalendar/angular/interaction';
import { EventClickInfo } from '@fullcalendar/angular';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../auth/auth.service';
import { Shell } from '../shell/shell';
import { CalendarService } from './calendar.service';
import {
  CalendarEvent,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  EventStatus,
  EventType,
  PlayerOption,
} from './calendar.model';

const TYPE_OPTIONS: { label: string; value: EventType }[] = [
  { label: 'Entrenamiento', value: 'TRAINING' },
  { label: 'Torneo', value: 'TOURNAMENT' },
  { label: 'Evaluación', value: 'EVALUATION' },
  { label: 'Partido', value: 'MATCH' },
  { label: 'Otro', value: 'OTHER' },
];

const STATUS_OPTIONS: { label: string; value: EventStatus }[] = [
  { label: 'Programado', value: 'SCHEDULED' },
  { label: 'Completado', value: 'COMPLETED' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function createDateWithTime(dateOnly: Date, timeValue: string): Date {
  const next = new Date(dateOnly);
  const [hours, minutes] = timeValue.split(':').map((v) => parseInt(v, 10));
  next.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return next;
}

@Component({
  selector: 'app-calendar',
  imports: [
    CommonModule,
    FormsModule,
    Shell,
    FullCalendarModule,
    ButtonModule,
    CardModule,
    ChipModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly authService = inject(AuthService);
  private readonly calendarService = inject(CalendarService);

  readonly user = this.authService.user;
  readonly isCoach = computed(() => this.user()?.role === 'coach');

  readonly typeOptions = TYPE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;
  readonly eventTypeColors = EVENT_TYPE_COLORS;
  readonly players = computed<PlayerOption[]>(() => this.calendarService.getPlayers());

  readonly detailVisible = signal(false);
  readonly selectedEvent = signal<CalendarEvent | null>(null);

  readonly formVisible = signal(false);
  readonly isEditing = signal(false);

  readonly form = signal<{
    id: string;
    title: string;
    type: EventType;
    date: Date;
    time: string;
    duration: number;
    playerId: string;
    description: string;
    status: EventStatus;
    objective: string;
  }>(this.emptyForm());

  readonly visibleEvents = computed(() => {
    const all = this.calendarService.events();
    const current = this.user();
    if (!current) return [];
    if (current.role === 'coach') return all;
    return all.filter((event) => event.participants.includes(current.name));
  });

  readonly hasEvents = computed(() => this.visibleEvents().length > 0);

  readonly fullCalendarEvents = computed(() =>
    this.visibleEvents().map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: EVENT_TYPE_COLORS[event.type],
      borderColor: EVENT_TYPE_COLORS[event.type],
      textColor: '#ffffff',
      extendedProps: { event },
    })),
  );

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek',
    },
    locale: 'es',
    firstDay: 1,
    height: 'auto',
    events: this.fullCalendarEvents(),
    eventClick: (info) => this.openDetail(info),
  }));

  openDetail(info: EventClickInfo): void {
    const event = info.event.extendedProps['event'] as CalendarEvent;
    this.selectedEvent.set(event);
    this.detailVisible.set(true);
  }

  closeDetail(): void {
    this.detailVisible.set(false);
    this.selectedEvent.set(null);
  }

  canEdit(event: CalendarEvent | null): boolean {
    if (!event) return false;
    const current = this.user();
    if (!current) return false;
    return this.calendarService.canEdit(event, current.role, current.name);
  }

  canDelete(event: CalendarEvent | null): boolean {
    if (!event) return false;
    const current = this.user();
    if (!current) return false;
    return this.calendarService.canDelete(event, current.role);
  }

  startCreate(): void {
    this.isEditing.set(false);
    this.form.set(this.emptyForm());
    this.formVisible.set(true);
  }

  startEdit(): void {
    const event = this.selectedEvent();
    if (!event) return;
    this.isEditing.set(true);
    this.form.set({
      id: event.id,
      title: event.title,
      type: event.type,
      date: new Date(event.start),
      time: toTimeInputValue(event.start),
      duration: durationMinutes(event.start, event.end),
      playerId: event.playerId ?? event.participants[0] ?? '',
      description: event.description,
      status: event.status,
      objective: event.objective ?? '',
    });
    this.detailVisible.set(false);
    this.formVisible.set(true);
  }

  saveEvent(): void {
    const value = this.form();
    const player = this.players().find((p) => p.id === value.playerId);
    const start = createDateWithTime(value.date, value.time);
    const end = new Date(start.getTime() + value.duration * 60000);

    const base: Omit<CalendarEvent, 'id'> = {
      title: value.title,
      type: value.type,
      start,
      end,
      description: value.description,
      participants: player ? [player.name] : [],
      objective: value.objective || undefined,
      status: value.status,
      createdBy: this.isCoach() ? 'coach' : 'player',
      playerId: value.playerId,
    };

    if (this.isEditing()) {
      this.calendarService.updateEvent({ ...base, id: value.id });
    } else {
      this.calendarService.addEvent(base);
    }

    this.formVisible.set(false);
  }

  deleteEvent(): void {
    const event = this.selectedEvent();
    if (!event) return;
    this.calendarService.deleteEvent(event.id);
    this.detailVisible.set(false);
  }

  closeForm(): void {
    this.formVisible.set(false);
  }

  emptyForm() {
    return {
      id: '',
      title: '',
      type: 'TRAINING' as EventType,
      date: new Date(),
      time: '17:00',
      duration: 60,
      playerId: '',
      description: '',
      status: 'SCHEDULED' as EventStatus,
      objective: '',
    };
  }

  typeLabel(type: EventType): string {
    return EVENT_TYPE_LABELS[type];
  }

  statusLabel(status: EventStatus): string {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  }

  formatDateTime(date: Date): string {
    return formatDateTime(date);
  }

  formatTime(date: Date): string {
    return formatTime(date);
  }

  duration(start: Date, end: Date): number {
    return durationMinutes(start, end);
  }
}
