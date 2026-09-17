import * as THREE from 'three';
import {
  BallDrill,
  CONE_DIMENSIONS,
  ConeMarker,
  DRILL_SCALE,
  Drill,
  DrillStep,
  FootworkStep,
  FootworkTarget,
  LadderSpec,
  PhysicalDrill,
  TABLE_DIMENSIONS,
} from '../coach-mode.models';

const RETICLE_RADIUS_INNER = 0.08;
const RETICLE_RADIUS_OUTER = 0.1;
const BALL_RADIUS = 0.02;
const RUNNER_RADIUS = 0.055;
/** Espesor de los largueros y travesaños de la escalera de agilidad, en metros. */
const LADDER_THICKNESS = 0.012;
/** Separación del pie que se saca al costado respecto del borde de la escalera, en metros. */
const LADDER_SIDE_MARGIN = 0.16;
/** Metros que recorre el objeto al arrastrar el dedo el alto completo de la pantalla. */
const PAN_SCREEN_METERS = 3;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
/** Altura a la que flota el cartel de instrucciones según el punto de anclaje (mesa o piso). */
const INSTRUCTION_HEIGHT = { pelota: 0.4, fisico: 1.35 } as const;

interface StepVisual {
  step: DrillStep;
  curve: THREE.CatmullRomCurve3;
  line: THREE.Mesh;
  ball: THREE.Mesh;
  totalDurationBeforeMs: number;
}

interface ConeVisual {
  marker: ConeMarker;
  cone: THREE.Mesh;
  /** Anillo en el piso que se enciende cuando el cono es el destino activo. */
  halo: THREE.Mesh;
  position: THREE.Vector3;
}

interface FootworkVisual {
  step: FootworkStep;
  from: THREE.Vector3;
  to: THREE.Vector3;
  path: THREE.Mesh;
  totalDurationBeforeMs: number;
}

/**
 * Encapsula toda la lógica de Three.js + WebXR de la sesión de RA del Modo Entrenador:
 * escena, hit-test para calibrar la superficie, y la visualización animada del ejercicio
 * elegido. Según la categoría del ejercicio dibuja una mesa reglamentaria con las
 * trayectorias de la pelota, o los conos en el piso con el recorrido entre ellos.
 * No depende de Angular para facilitar su `dispose()` determinista desde `ngOnDestroy`.
 */
export class ArScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera();

  private readonly reticle: THREE.Mesh;
  /** Grupo anclado al punto calibrado: contiene la mesa (o los conos) y el ejercicio. */
  private readonly tableGroup = new THREE.Group();
  private readonly drillGroup = new THREE.Group();
  /** Mesa reglamentaria; solo visible en ejercicios con pelota. */
  private readonly tableModel: THREE.Group;
  private readonly instructionSprite: THREE.Sprite;
  private instructionTexture: THREE.CanvasTexture | null = null;

  private hitTestSource: XRHitTestSource | null = null;
  private viewerSpace: XRReferenceSpace | null = null;
  private hitTestRequested = false;

  private calibrated = false;
  private playing = true;
  private currentDrill: Drill | null = null;
  private stepVisuals: StepVisual[] = [];
  private coneVisuals: ConeVisual[] = [];
  private footworkVisuals: FootworkVisual[] = [];
  /** Marcador que recorre el camino entre conos en los ejercicios físicos. */
  private runner: THREE.Mesh | null = null;
  /** Escalera de agilidad y resaltado de la celda activa (solo en ejercicios de escalera). */
  private ladderModel: THREE.Group | null = null;
  private cellHighlight: THREE.Mesh | null = null;
  private scale: number = DRILL_SCALE.default;
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

    this.tableModel = this.createTableModel();
    this.tableModel.visible = false;

    this.tableGroup.visible = false;
    this.tableGroup.add(this.tableModel);
    this.tableGroup.add(this.drillGroup);
    this.scene.add(this.tableGroup);

    this.instructionSprite = this.createInstructionSprite('');
    this.instructionSprite.position.set(0, INSTRUCTION_HEIGHT.pelota, 0);
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
    this.tableModel.visible = drill.category === 'pelota';
    this.instructionSprite.position.y = INSTRUCTION_HEIGHT[drill.category];
    this.buildDrillVisuals(drill);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  /**
   * Escala uniforme del ejercicio anclado (mesa, conos o escalera) para que el usuario pueda
   * ajustarlo a su espacio real. Devuelve la escala efectiva ya limitada al rango permitido.
   */
  setScale(scale: number): number {
    this.scale = Math.min(DRILL_SCALE.max, Math.max(DRILL_SCALE.min, scale));
    this.tableGroup.scale.setScalar(this.scale);
    return this.scale;
  }

  getScale(): number {
    return this.scale;
  }

  /**
   * Arrastra el ejercicio sobre el plano del piso siguiendo el dedo: el desplazamiento se
   * interpreta respecto de hacia dónde mira la cámara, así "hacia abajo" siempre acerca el
   * objeto al usuario sin importar desde qué lado lo esté mirando.
   */
  panBy(deltaXPixels: number, deltaYPixels: number): void {
    const metersPerPixel = PAN_SCREEN_METERS / Math.max(window.innerHeight, 1);
    const forward = new THREE.Vector3();
    this.renderer.xr.getCamera().getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) {
      // Cámara mirando de frente al piso: no hay dirección horizontal útil.
      return;
    }
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, WORLD_UP).normalize();

    this.tableGroup.position
      .addScaledVector(right, deltaXPixels * metersPerPixel)
      .addScaledVector(forward, -deltaYPixels * metersPerPixel);
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

    if (this.totalDurationMs === 0) return;
    this.elapsedMs = (this.elapsedMs + deltaMs) % this.totalDurationMs;

    if (this.currentDrill?.category === 'fisico') {
      this.advanceFootworkAnimation();
      return;
    }
    this.advanceBallAnimation();
  }

  private advanceBallAnimation(): void {
    if (this.stepVisuals.length === 0) return;

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

  private advanceFootworkAnimation(): void {
    if (this.footworkVisuals.length === 0) return;

    const active = this.footworkVisuals.find(
      (visual) =>
        this.elapsedMs >= visual.totalDurationBeforeMs &&
        this.elapsedMs < visual.totalDurationBeforeMs + visual.step.durationMs,
    );

    for (const visual of this.footworkVisuals) {
      const material = visual.path.material as THREE.MeshBasicMaterial;
      material.opacity = visual === active ? 0.9 : 0.25;
    }

    if (!active) return;

    const localT = Math.min(
      1,
      Math.max(0, (this.elapsedMs - active.totalDurationBeforeMs) / active.step.durationMs),
    );

    // El marcador avanza en línea recta con un pequeño salto para que se lea la dirección.
    if (this.runner) {
      this.runner.position.lerpVectors(active.from, active.to, localT);
      this.runner.position.y = RUNNER_RADIUS + 0.12 * Math.sin(Math.PI * localT);
    }

    // El cono de destino se agranda y enciende su halo mientras es el objetivo.
    const target = active.step.target;
    for (const visual of this.coneVisuals) {
      const isTarget = target.kind === 'cono' && visual.marker.id === target.coneId;
      const scale = isTarget ? 1 + 0.12 * Math.sin(Math.PI * localT) : 1;
      visual.cone.scale.setScalar(scale);
      visual.halo.visible = isTarget;
      (visual.halo.material as THREE.MeshBasicMaterial).opacity = isTarget
        ? 0.35 + 0.3 * localT
        : 0;
    }

    // En la escalera se ilumina el cuadrado al que hay que entrar.
    const ladder = this.currentDrill?.category === 'fisico' ? this.currentDrill.ladder : undefined;
    if (this.cellHighlight && ladder) {
      this.cellHighlight.visible = target.kind === 'escalera';
      if (target.kind === 'escalera') {
        this.cellHighlight.position.z = this.ladderCellZ(ladder, target.cell);
        const material = this.cellHighlight.material as THREE.MeshBasicMaterial;
        material.color.set(active.step.color);
        material.opacity = 0.2 + 0.25 * Math.sin(Math.PI * localT);
      }
    }

    this.updateInstructionText(active.step.instruction);
  }

  private buildDrillVisuals(drill: Drill): void {
    this.clearDrillVisuals();
    if (drill.category === 'fisico') {
      this.buildFootworkVisuals(drill);
      return;
    }
    this.buildBallVisuals(drill);
  }

  /** Quita del grupo del ejercicio todo lo construido para el ejercicio anterior. */
  private clearDrillVisuals(): void {
    for (const visual of this.stepVisuals) {
      this.drillGroup.remove(visual.line, visual.ball);
      disposeMesh(visual.line);
      disposeMesh(visual.ball);
    }
    this.stepVisuals = [];

    for (const visual of this.coneVisuals) {
      this.drillGroup.remove(visual.cone, visual.halo);
      disposeMesh(visual.cone);
      disposeMesh(visual.halo);
    }
    this.coneVisuals = [];

    for (const visual of this.footworkVisuals) {
      this.drillGroup.remove(visual.path);
      disposeMesh(visual.path);
    }
    this.footworkVisuals = [];

    if (this.runner) {
      this.drillGroup.remove(this.runner);
      disposeMesh(this.runner);
      this.runner = null;
    }

    if (this.ladderModel) {
      this.drillGroup.remove(this.ladderModel);
      disposeGroup(this.ladderModel);
      this.ladderModel = null;
    }

    if (this.cellHighlight) {
      this.drillGroup.remove(this.cellHighlight);
      disposeMesh(this.cellHighlight);
      this.cellHighlight = null;
    }
  }

  /** Conos (o escalera de agilidad) en el piso + tramos del recorrido entre ellos. */
  private buildFootworkVisuals(drill: PhysicalDrill): void {
    for (const marker of drill.cones) {
      const position = new THREE.Vector3(marker.x, 0, marker.z);

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(CONE_DIMENSIONS.radius, CONE_DIMENSIONS.height, 24),
        new THREE.MeshStandardMaterial({ color: marker.color, roughness: 0.5 }),
      );
      cone.position.set(position.x, CONE_DIMENSIONS.height / 2, position.z);
      this.drillGroup.add(cone);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(CONE_DIMENSIONS.radius * 1.6, CONE_DIMENSIONS.radius * 2.2, 32)
          .rotateX(-Math.PI / 2)
          .translate(position.x, 0.005, position.z),
        new THREE.MeshBasicMaterial({
          color: marker.color,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        }),
      );
      halo.visible = false;
      this.drillGroup.add(halo);

      this.coneVisuals.push({ marker, cone, halo, position });
    }

    if (drill.ladder) {
      this.ladderModel = this.createLadderModel(drill.ladder);
      this.drillGroup.add(this.ladderModel);
      this.cellHighlight = this.createCellHighlight(drill.ladder);
      this.drillGroup.add(this.cellHighlight);
    }

    let accumulated = 0;
    const lastStep = drill.steps[drill.steps.length - 1];
    let previous = (lastStep && this.resolveTarget(drill, lastStep.target)) ?? new THREE.Vector3();
    for (const step of drill.steps) {
      const to = this.resolveTarget(drill, step.target);
      if (!to) continue;

      const from = previous.clone();
      const path = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.LineCurve3(from.clone().setY(0.01), to.clone().setY(0.01)),
          1,
          0.012,
          8,
          false,
        ),
        new THREE.MeshBasicMaterial({ color: step.color, transparent: true, opacity: 0.25 }),
      );
      this.drillGroup.add(path);

      this.footworkVisuals.push({
        step,
        from,
        to: to.clone(),
        path,
        totalDurationBeforeMs: accumulated,
      });
      accumulated += step.durationMs;
      previous = to.clone();
    }
    this.totalDurationMs = accumulated;

    const runner = new THREE.Mesh(
      new THREE.SphereGeometry(RUNNER_RADIUS, 20, 20),
      new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#f59e0b', roughness: 0.3 }),
    );
    runner.position.set(previous.x, RUNNER_RADIUS, previous.z);
    this.drillGroup.add(runner);
    this.runner = runner;
  }

  /**
   * Punto en el piso de un destino: la base del cono, o el centro de la celda de la escalera
   * (desplazado al costado cuando el paso pide sacar el pie afuera).
   */
  private resolveTarget(drill: PhysicalDrill, target: FootworkTarget): THREE.Vector3 | null {
    if (target.kind === 'cono') {
      return this.coneVisuals.find((v) => v.marker.id === target.coneId)?.position.clone() ?? null;
    }

    const ladder = drill.ladder;
    if (!ladder) return null;
    const sideOffset = ladder.width / 2 + LADDER_SIDE_MARGIN;
    const x =
      target.side === 'izquierda' ? -sideOffset : target.side === 'derecha' ? sideOffset : 0;
    return new THREE.Vector3(x, 0, this.ladderCellZ(ladder, target.cell));
  }

  /** Centro de una celda en z: la escalera arranca en el punto calibrado y avanza hacia -z. */
  private ladderCellZ(ladder: LadderSpec, cell: number): number {
    return -(cell + 0.5) * ladder.cellLength;
  }

  /** Escalera de agilidad plana sobre el piso: dos largueros y los travesaños de cada cuadrado. */
  private createLadderModel(ladder: LadderSpec): THREE.Group {
    const group = new THREE.Group();
    const totalLength = ladder.cells * ladder.cellLength;
    const material = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.6 });
    const railWidth = 0.03;

    for (const side of [-1, 1] as const) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(railWidth, LADDER_THICKNESS, totalLength),
        material,
      );
      rail.position.set((side * ladder.width) / 2, LADDER_THICKNESS / 2, -totalLength / 2);
      group.add(rail);
    }

    for (let i = 0; i <= ladder.cells; i++) {
      const rung = new THREE.Mesh(
        new THREE.BoxGeometry(ladder.width + railWidth, LADDER_THICKNESS, railWidth),
        material,
      );
      rung.position.set(0, LADDER_THICKNESS / 2, -i * ladder.cellLength);
      group.add(rung);
    }

    return group;
  }

  /** Panel translúcido que ilumina el cuadrado de la escalera al que hay que entrar. */
  private createCellHighlight(ladder: LadderSpec): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(ladder.width, ladder.cellLength).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: '#16a34a',
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.y = 0.004;
    mesh.visible = false;
    return mesh;
  }

  private buildBallVisuals(drill: BallDrill): void {
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

  /**
   * Mesa reglamentaria ITTF (2,74 × 1,525 m, red de 15,25 cm) construida con la superficie
   * de juego en `y = 0`, que es el punto que el usuario calibra: así las trayectorias de los
   * ejercicios, expresadas respecto del centro de la mesa, caen justo sobre el tablero.
   */
  private createTableModel(): THREE.Group {
    const { length, width, height, netHeight, netOverhang, lineWidth, topThickness } =
      TABLE_DIMENSIONS;
    const group = new THREE.Group();

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width, topThickness, length),
      new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.75 }),
    );
    top.position.y = -topThickness / 2;
    group.add(top);

    // Líneas blancas: los dos laterales, los dos fondos y la central de dobles.
    const lineMaterial = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
    const addLine = (sizeX: number, sizeZ: number, x: number, z: number) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.002, sizeZ), lineMaterial);
      line.position.set(x, 0.001, z);
      group.add(line);
    };
    const halfWidth = width / 2;
    const halfLength = length / 2;
    addLine(lineWidth, length, -halfWidth + lineWidth / 2, 0);
    addLine(lineWidth, length, halfWidth - lineWidth / 2, 0);
    addLine(width, lineWidth, 0, -halfLength + lineWidth / 2);
    addLine(width, lineWidth, 0, halfLength - lineWidth / 2);
    addLine(0.003, length, 0, 0);

    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(width + netOverhang * 2, netHeight),
      new THREE.MeshBasicMaterial({
        color: '#0f172a',
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    );
    net.position.y = netHeight / 2;
    group.add(net);

    const netTape = new THREE.Mesh(
      new THREE.BoxGeometry(width + netOverhang * 2, 0.015, 0.004),
      new THREE.MeshBasicMaterial({ color: '#f8fafc' }),
    );
    netTape.position.y = netHeight;
    group.add(netTape);

    // Patas: solo cuatro cajas finas, suficientes para dar sensación de volumen en RA.
    const legMaterial = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.6 });
    const legHeight = height - topThickness;
    for (const [sx, sz] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, legHeight, 0.05), legMaterial);
      leg.position.set(
        sx * (halfWidth - 0.12),
        -topThickness - legHeight / 2,
        sz * (halfLength - 0.2),
      );
      group.add(leg);
    }

    return group;
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

/** Libera la geometría y el material de una malla que se quita de la escena. */
function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const material = mesh.material;
  for (const mat of Array.isArray(material) ? material : [material]) {
    mat.dispose();
  }
}

function disposeGroup(group: THREE.Group): void {
  for (const child of group.children) {
    if (child instanceof THREE.Mesh) disposeMesh(child);
  }
}
