import * as THREE from 'three';
import { Drill, DrillStep, TABLE_DIMENSIONS } from '../coach-mode.models';

const RETICLE_RADIUS_INNER = 0.08;
const RETICLE_RADIUS_OUTER = 0.1;
const BALL_RADIUS = 0.02;

interface StepVisual {
  step: DrillStep;
  curve: THREE.CatmullRomCurve3;
  line: THREE.Mesh;
  ball: THREE.Mesh;
  totalDurationBeforeMs: number;
}

/**
 * Encapsula toda la lógica de Three.js + WebXR de la sesión de RA del Modo Entrenador:
 * escena, hit-test para calibrar la mesa, y la visualización animada del ejercicio elegido
 * (trayectorias, pelotas y texto flotante). No depende de Angular para facilitar su
 * `dispose()` determinista desde `ngOnDestroy`.
 */
export class ArScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera();

  private readonly reticle: THREE.Mesh;
  private readonly tableGroup = new THREE.Group();
  private readonly drillGroup = new THREE.Group();
  private readonly instructionSprite: THREE.Sprite;
  private instructionTexture: THREE.CanvasTexture | null = null;

  private hitTestSource: XRHitTestSource | null = null;
  private viewerSpace: XRReferenceSpace | null = null;
  private hitTestRequested = false;

  private calibrated = false;
  private playing = true;
  private currentDrill: Drill | null = null;
  private stepVisuals: StepVisual[] = [];
  private totalDurationMs = 0;
  private elapsedMs = 0;
  private lastFrameTimeMs: number | null = null;

  private readonly onSelect = () => this.handleSelect();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly session: XRSession,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(0.5, 1, 0.25);
    this.scene.add(directional);

    this.reticle = this.createReticle();
    this.scene.add(this.reticle);

    this.tableGroup.visible = false;
    this.tableGroup.add(this.drillGroup);
    this.scene.add(this.tableGroup);

    this.instructionSprite = this.createInstructionSprite('');
    this.instructionSprite.position.set(0, TABLE_DIMENSIONS.height * 0 + 0.4, 0);
    this.drillGroup.add(this.instructionSprite);

    this.session.addEventListener('select', this.onSelect);
  }

  /** Inicializa el hit-test source sobre el espacio del visor; debe llamarse antes de renderizar. */
  async init(): Promise<void> {
    await this.renderer.xr.setSession(this.session);
    this.viewerSpace = await this.session.requestReferenceSpace('viewer');
    this.hitTestSource =
      (await this.session.requestHitTestSource!({ space: this.viewerSpace })) ?? null;
    this.hitTestRequested = true;
    this.renderer.setAnimationLoop((time, frame) => this.onXRFrame(time, frame));
  }

  /** Carga el ejercicio a visualizar; los objetos 3D se (re)construyen inmediatamente. */
  loadDrill(drill: Drill): void {
    this.currentDrill = drill;
    this.buildDrillVisuals(drill);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  isCalibrated(): boolean {
    return this.calibrated;
  }

  /** Vuelve a mostrar la retícula de calibración y oculta la visualización del ejercicio. */
  recalibrate(): void {
    this.calibrated = false;
    this.tableGroup.visible = false;
    this.reticle.visible = true;
    this.elapsedMs = 0;
    this.lastFrameTimeMs = null;
  }

  /** Libera geometrías, materiales, texturas y el contexto WebGL. Debe llamarse en ngOnDestroy. */
  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.session.removeEventListener('select', this.onSelect);
    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        object.geometry?.dispose?.();
        const material = object.material;
        const materials = Array.isArray(material) ? material : [material];
        for (const mat of materials) {
          const map = (mat as THREE.Material & { map?: THREE.Texture | null }).map;
          map?.dispose();
          mat.dispose();
        }
      }
    });
    this.instructionTexture?.dispose();
    this.renderer.dispose();
  }

  private onXRFrame(_time: number, frame?: XRFrame): void {
    if (!frame) return;

    if (!this.calibrated && this.hitTestSource) {
      const referenceSpace = this.renderer.xr.getReferenceSpace();
      const results = frame.getHitTestResults(this.hitTestSource);
      if (results.length > 0 && referenceSpace) {
        const pose = results[0].getPose(referenceSpace);
        if (pose) {
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        this.reticle.visible = false;
      }
    }

    if (this.calibrated && this.playing) {
      this.advanceAnimation();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private advanceAnimation(): void {
    const now = performance.now();
    if (this.lastFrameTimeMs === null) {
      this.lastFrameTimeMs = now;
      return;
    }
    const deltaMs = now - this.lastFrameTimeMs;
    this.lastFrameTimeMs = now;

    if (this.totalDurationMs === 0 || this.stepVisuals.length === 0) return;

    this.elapsedMs = (this.elapsedMs + deltaMs) % this.totalDurationMs;

    const active = this.stepVisuals.find(
      (visual) =>
        this.elapsedMs >= visual.totalDurationBeforeMs &&
        this.elapsedMs < visual.totalDurationBeforeMs + visual.step.durationMs,
    );

    for (const visual of this.stepVisuals) {
      const isActive = visual === active;
      visual.ball.visible = isActive;
      const material = visual.line.material as THREE.MeshBasicMaterial;
      material.opacity = isActive ? 0.95 : 0.35;
    }

    if (active) {
      const localT = (this.elapsedMs - active.totalDurationBeforeMs) / active.step.durationMs;
      const point = active.curve.getPoint(Math.min(1, Math.max(0, localT)));
      active.ball.position.copy(point);
      this.updateInstructionText(active.step.instruction);
    }
  }

  private handleSelect(): void {
    if (this.calibrated || !this.reticle.visible) return;
    this.tableGroup.position.setFromMatrixPosition(this.reticle.matrix);
    this.tableGroup.quaternion.setFromRotationMatrix(this.reticle.matrix);
    this.tableGroup.visible = true;
    this.reticle.visible = false;
    this.calibrated = true;
    this.elapsedMs = 0;
    this.lastFrameTimeMs = null;
    if (this.currentDrill) {
      this.buildDrillVisuals(this.currentDrill);
    }
  }

  private buildDrillVisuals(drill: Drill): void {
    for (const visual of this.stepVisuals) {
      this.drillGroup.remove(visual.line, visual.ball);
      visual.line.geometry.dispose();
      (visual.line.material as THREE.Material).dispose();
      visual.ball.geometry.dispose();
      (visual.ball.material as THREE.Material).dispose();
    }
    this.stepVisuals = [];

    let accumulated = 0;
    for (const step of drill.steps) {
      const points = step.trajectory.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.004, 8, false);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: step.color,
        transparent: true,
        opacity: 0.35,
      });
      const line = new THREE.Mesh(tubeGeometry, lineMaterial);
      this.drillGroup.add(line);

      const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
      const ballMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
      const ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.visible = false;
      ball.position.copy(points[0]);
      this.drillGroup.add(ball);

      this.stepVisuals.push({ step, curve, line, ball, totalDurationBeforeMs: accumulated });
      accumulated += step.durationMs;
    }
    this.totalDurationMs = accumulated;
  }

  private createReticle(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(RETICLE_RADIUS_INNER, RETICLE_RADIUS_OUTER, 32).rotateX(
      -Math.PI / 2,
    );
    const material = new THREE.MeshBasicMaterial({
      color: '#16a34a',
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
    return mesh;
  }

  private createInstructionSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    this.instructionTexture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: this.instructionTexture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.2, 1);
    this.paintInstructionCanvas(canvas, text);
    return sprite;
  }

  private updateInstructionText(text: string): void {
    const canvas = this.instructionTexture?.image as HTMLCanvasElement | undefined;
    if (!canvas) return;
    this.paintInstructionCanvas(canvas, text);
    this.instructionTexture!.needsUpdate = true;
  }

  private paintInstructionCanvas(canvas: HTMLCanvasElement, text: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 32);
  }
}
