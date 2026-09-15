import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import {
  LucideFlag,
  LucidePause,
  LucidePlay,
  LucideRotateCcw,
  LucideTimer,
  LucideX,
} from '@lucide/angular';

type TimerMode = 'cronometro' | 'temporizador';

interface Lap {
  index: number;
  /** Tiempo total acumulado al marcar la vuelta, en milisegundos. */
  total: number;
  /** Duración de esta vuelta respecto de la anterior, en milisegundos. */
  split: number;
}

/** Refresco del display: 50 ms alcanza para ver centésimas sin saturar el change detection. */
const TICK_MS = 50;

@Component({
  selector: 'app-timer-modal',
  standalone: true,
  imports: [LucideX, LucidePlay, LucidePause, LucideRotateCcw, LucideFlag, LucideTimer],
  templateUrl: './timer-modal.html',
})
export class TimerModal {
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();

  protected readonly mode = signal<TimerMode>('cronometro');
  protected readonly running = signal(false);
  protected readonly laps = signal<Lap[]>([]);

  /** Duración configurada de la cuenta regresiva. */
  protected readonly presetMinutes = signal(2);
  protected readonly presetSeconds = signal(0);

  /** Se activa cuando el temporizador llega a cero, hasta que se reinicia. */
  protected readonly finished = signal(false);

  /** Milisegundos ya transcurridos en los tramos anteriores (antes de la pausa actual). */
  private accumulated = 0;
  /** Marca de tiempo (Date.now) en la que arrancó el tramo en curso, o null si está pausado. */
  private startedAt: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;

  /** Milisegundos transcurridos; se recalcula en cada tick contra Date.now() para evitar drift. */
  protected readonly elapsed = signal(0);

  private readonly presetMs = computed(
    () => (this.presetMinutes() * 60 + this.presetSeconds()) * 1000,
  );

  /** Tiempo que muestra el display: ascendente en cronómetro, restante en temporizador. */
  protected readonly displayMs = computed(() =>
    this.mode() === 'cronometro' ? this.elapsed() : Math.max(0, this.presetMs() - this.elapsed()),
  );

  protected readonly display = computed(() => this.format(this.displayMs()));

  protected readonly canStart = computed(() => this.mode() === 'cronometro' || this.presetMs() > 0);

  protected readonly isPristine = computed(() => this.elapsed() === 0 && !this.running());

  constructor() {
    this.destroyRef.onDestroy(() => this.clearInterval());
  }

  protected setMode(mode: TimerMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.reset();
  }

  protected toggle(): void {
    if (this.running()) {
      this.pause();
      return;
    }
    this.start();
  }

  protected start(): void {
    if (!this.canStart()) return;
    this.finished.set(false);
    this.startedAt = Date.now();
    this.running.set(true);
    this.clearInterval();
    this.intervalId = setInterval(() => this.tick(), TICK_MS);
  }

  protected pause(): void {
    if (!this.running()) return;
    this.accumulated = this.currentElapsed();
    this.startedAt = null;
    this.running.set(false);
    this.elapsed.set(this.accumulated);
    this.clearInterval();
  }

  protected reset(): void {
    this.clearInterval();
    this.accumulated = 0;
    this.startedAt = null;
    this.running.set(false);
    this.finished.set(false);
    this.elapsed.set(0);
    this.laps.set([]);
  }

  /** Registra una vuelta con su parcial respecto de la anterior (solo en modo cronómetro). */
  protected addLap(): void {
    const total = this.elapsed();
    this.laps.update((laps) => {
      const previousTotal = laps.length > 0 ? laps[laps.length - 1].total : 0;
      return [...laps, { index: laps.length + 1, total, split: total - previousTotal }];
    });
  }

  protected setPresetMinutes(value: string): void {
    this.presetMinutes.set(this.clamp(value, 0, 599));
    this.reset();
  }

  protected setPresetSeconds(value: string): void {
    this.presetSeconds.set(this.clamp(value, 0, 59));
    this.reset();
  }

  protected close(): void {
    this.clearInterval();
    this.closed.emit();
  }

  protected format(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  private tick(): void {
    const elapsed = this.currentElapsed();
    this.elapsed.set(elapsed);

    if (this.mode() === 'temporizador' && elapsed >= this.presetMs()) {
      this.elapsed.set(this.presetMs());
      this.accumulated = this.presetMs();
      this.startedAt = null;
      this.running.set(false);
      this.finished.set(true);
      this.clearInterval();
      this.beep();
    }
  }

  private currentElapsed(): number {
    return this.startedAt === null
      ? this.accumulated
      : this.accumulated + (Date.now() - this.startedAt);
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Aviso sonoro corto al terminar la cuenta regresiva; si el navegador lo bloquea, se ignora. */
  private beep(): void {
    try {
      this.audioContext ??= new AudioContext();
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.6);
    } catch {
      // Audio no disponible (permisos, navegador sin AudioContext): el aviso visual es suficiente.
    }
  }

  private clamp(value: string, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
  }
}
