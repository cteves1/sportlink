import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideCircleAlert,
  LucideCirclePause,
  LucideCirclePlay,
  LucideRotateCcw,
  LucideX,
  LucideZoomIn,
  LucideZoomOut,
} from '@lucide/angular';
import { CoachModeService } from '../coach-mode.service';
import { DRILL_SCALE, Drill } from '../coach-mode.models';
import { isArSupported } from '../ar/ar-support';
import { AR_NOT_SUPPORTED_MESSAGE, ArNotSupported } from './ar-not-supported';

type SessionPhase = 'checking' | 'unsupported' | 'idle' | 'starting' | 'active' | 'error';

/**
 * Vista de pantalla completa (fuera del `Shell`) donde ocurre la sesión de Realidad Aumentada:
 * pide permisos de cámara/WebXR, calibra la mesa vía hit-test y reproduce la visualización
 * del ejercicio elegido. Gestiona con cuidado el ciclo de vida de la `XRSession` y del
 * `WebGLRenderer` para no dejar la cámara encendida ni fugar memoria al salir.
 */
@Component({
  selector: 'app-coach-ar-session',
  standalone: true,
  imports: [
    LucideCircleAlert,
    LucideCirclePause,
    LucideCirclePlay,
    LucideRotateCcw,
    LucideX,
    LucideZoomIn,
    LucideZoomOut,
    ArNotSupported,
  ],
  templateUrl: './coach-ar-session.html',
})
export class CoachArSession implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coachModeService = inject(CoachModeService);

  protected readonly notSupportedMessage = AR_NOT_SUPPORTED_MESSAGE;

  // `viewChild` sobre un elemento del template entrega un `ElementRef`: hay que leer
  // `nativeElement` antes de pasarlo a WebXR o a three.js, que esperan nodos DOM reales.
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly overlayRef = viewChild<ElementRef<HTMLDivElement>>('overlay');

  protected readonly phase = signal<SessionPhase>('checking');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly playing = signal(true);
  protected readonly calibrated = signal(false);

  /** Escala del ejercicio anclado, ajustable durante la sesión. */
  protected readonly scale = signal<number>(DRILL_SCALE.default);
  protected readonly scalePercent = computed(() => Math.round(this.scale() * 100));
  protected readonly canGrow = computed(() => this.scale() < DRILL_SCALE.max);
  protected readonly canShrink = computed(() => this.scale() > DRILL_SCALE.min);

  protected drill: Drill | null = null;

  /** Lo que se ancla en el piso o la mesa según el ejercicio, para redactar las ayudas. */
  private get anchorSubject(): string {
    if (this.drill?.category !== 'fisico') return 'la mesa';
    return this.drill.ladder ? 'la escalera' : 'los conos';
  }

  /** Texto previo a iniciar la RA: la referencia a calibrar cambia según la categoría. */
  protected get startHint(): string {
    return this.drill?.category === 'fisico'
      ? `Activa la cámara para marcar el piso donde vas a entrenar y ver ${this.anchorSubject} del ejercicio.`
      : 'Activa la cámara para calibrar tu mesa y ver el ejercicio en Realidad Aumentada.';
  }

  /** Texto mientras el usuario todavía no ancló el ejercicio. */
  protected get calibrationHint(): string {
    return this.drill?.category === 'fisico'
      ? `Apunta al piso y toca la pantalla sobre la retícula verde para colocar ${this.anchorSubject}.`
      : 'Apunta al centro de la mesa y toca la pantalla sobre la retícula verde para calibrar.';
  }

  // Se mantienen fuera de signals: son objetos no serializables cuyo único consumidor
  // es el propio ciclo de vida del componente (no se leen desde la plantilla).
  private xrSession: XRSession | null = null;
  private arScene: import('../ar/ar-scene').ArScene | null = null;

  /** Último punto del dedo que arrastra el ejercicio, en píxeles de pantalla. */
  private dragPoint: { x: number; y: number } | null = null;
  /** Distancia entre los dos dedos al empezar la pinza, y escala en ese momento. */
  private pinchStartDistance = 0;
  private pinchStartScale: number = DRILL_SCALE.default;

  /**
   * Gestos sobre el ejercicio ya anclado: un dedo lo arrastra por el piso y dos dedos lo
   * agrandan o achican. La capa que los captura solo existe una vez calibrado, porque
   * mientras se calibra el toque lo necesita WebXR para el evento `select` del hit-test.
   */
  protected onTouchStart(event: TouchEvent): void {
    if (event.touches.length >= 2) {
      this.dragPoint = null;
      this.pinchStartDistance = touchDistance(event);
      this.pinchStartScale = this.scale();
      return;
    }

    const touch = event.touches[0];
    this.dragPoint = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  protected onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length >= 2) {
      if (this.pinchStartDistance === 0) return;
      const factor = touchDistance(event) / this.pinchStartDistance;
      this.applyScale(this.pinchStartScale * factor);
      return;
    }

    const touch = event.touches[0];
    if (!touch || !this.dragPoint) return;
    this.arScene?.panBy(touch.clientX - this.dragPoint.x, touch.clientY - this.dragPoint.y);
    this.dragPoint = { x: touch.clientX, y: touch.clientY };
  }

  protected onTouchEnd(event: TouchEvent): void {
    this.pinchStartDistance = 0;
    // Si queda un dedo en pantalla, el arrastre continúa desde su posición actual.
    const touch = event.touches[0];
    this.dragPoint =
      event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  async ngOnInit(): Promise<void> {
    const drillId = this.route.snapshot.paramMap.get('drillId');
    this.drill = drillId ? this.coachModeService.drillById(drillId) : null;

    if (!this.drill) {
      this.router.navigate(['/coach-mode']);
      return;
    }

    const supported = await isArSupported();
    this.phase.set(supported ? 'idle' : 'unsupported');
  }

  ngOnDestroy(): void {
    this.arScene?.dispose();
    this.arScene = null;
    if (this.xrSession) {
      void this.xrSession.end().catch(() => {});
      this.xrSession = null;
    }
  }

  protected async startArSession(): Promise<void> {
    if (!this.drill || this.phase() === 'starting') return;
    this.phase.set('starting');
    this.errorMessage.set(null);

    try {
      const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
      if (!xr) throw new Error('WebXR no disponible en este navegador.');

      const overlayRoot = this.overlayRef()?.nativeElement;
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        ...(overlayRoot ? { domOverlay: { root: overlayRoot } } : {}),
      });
      this.xrSession = session;
      session.addEventListener('end', () => this.handleSessionEnded());

      const canvas = this.canvasRef()?.nativeElement;
      if (!canvas) throw new Error('No se pudo inicializar el lienzo de RA.');

      // Carga perezosa: three.js solo se descarga cuando el usuario realmente inicia la RA.
      const { ArScene } = await import('../ar/ar-scene');
      const scene = new ArScene(canvas, session);
      await scene.init();
      scene.loadDrill(this.drill);
      scene.setScale(this.scale());
      this.arScene = scene;

      this.phase.set('active');
      this.pollCalibration();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar la sesión de Realidad Aumentada.',
      );
      this.phase.set('error');
    }
  }

  /** Refleja en la UI el momento en que el usuario calibra la mesa (toca la retícula). */
  private pollCalibration(): void {
    const check = () => {
      if (!this.arScene) return;
      this.calibrated.set(this.arScene.isCalibrated());
      if (this.phase() === 'active') {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  }

  protected togglePlaying(): void {
    const next = !this.playing();
    this.playing.set(next);
    this.arScene?.setPlaying(next);
  }

  /** Agranda o achica la mesa/los conos en pasos de 5 % para calzarlos con el espacio real. */
  protected adjustScale(steps: number): void {
    this.applyScale(this.scale() + steps * DRILL_SCALE.step);
  }

  protected resetScale(): void {
    this.applyScale(DRILL_SCALE.default);
  }

  /** La escena recorta la escala al rango permitido y devuelve la que quedó aplicada. */
  private applyScale(scale: number): void {
    this.scale.set(this.arScene?.setScale(scale) ?? scale);
  }

  protected recalibrate(): void {
    this.arScene?.recalibrate();
    this.calibrated.set(false);
    this.pollCalibration();
  }

  protected exitSession(): void {
    this.ngOnDestroy();
    this.router.navigate(['/coach-mode']);
  }

  private handleSessionEnded(): void {
    this.xrSession = null;
    if (this.phase() === 'active' || this.phase() === 'starting') {
      this.router.navigate(['/coach-mode']);
    }
  }
}

/** Distancia en píxeles entre los dos primeros dedos de un gesto de pinza. */
function touchDistance(event: TouchEvent): number {
  const [first, second] = [event.touches[0], event.touches[1]];
  if (!first || !second) return 0;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}
