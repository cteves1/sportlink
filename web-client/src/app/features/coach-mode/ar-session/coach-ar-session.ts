import { Component, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideCircleAlert,
  LucideCirclePause,
  LucideCirclePlay,
  LucideRotateCcw,
  LucideX,
} from '@lucide/angular';
import { CoachModeService } from '../coach-mode.service';
import { Drill } from '../coach-mode.models';
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
    ArNotSupported,
  ],
  templateUrl: './coach-ar-session.html',
})
export class CoachArSession implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coachModeService = inject(CoachModeService);

  protected readonly notSupportedMessage = AR_NOT_SUPPORTED_MESSAGE;

  private readonly canvasRef = viewChild<HTMLCanvasElement>('canvas');
  private readonly overlayRef = viewChild<HTMLDivElement>('overlay');

  protected readonly phase = signal<SessionPhase>('checking');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly playing = signal(true);
  protected readonly calibrated = signal(false);

  protected drill: Drill | null = null;

  // Se mantienen fuera de signals: son objetos no serializables cuyo único consumidor
  // es el propio ciclo de vida del componente (no se leen desde la plantilla).
  private xrSession: XRSession | null = null;
  private arScene: import('../ar/ar-scene').ArScene | null = null;

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

      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: this.overlayRef() ? { root: this.overlayRef()! } : undefined,
      });
      this.xrSession = session;
      session.addEventListener('end', () => this.handleSessionEnded());

      const canvas = this.canvasRef();
      if (!canvas) throw new Error('No se pudo inicializar el lienzo de RA.');

      // Carga perezosa: three.js solo se descarga cuando el usuario realmente inicia la RA.
      const { ArScene } = await import('../ar/ar-scene');
      const scene = new ArScene(canvas, session);
      await scene.init();
      scene.loadDrill(this.drill);
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
